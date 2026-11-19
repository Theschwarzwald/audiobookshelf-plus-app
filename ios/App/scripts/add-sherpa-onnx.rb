#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Adds ABS+ on-device transcription to the Xcode project (ios/App/App.xcodeproj, target "Audiobookshelf").
# Uses the xcodeproj gem (it comes with CocoaPods). Safe to run more than once.
#
#   ruby ios/App/scripts/add-sherpa-onnx.rb            add the transcription sources, and the speech engine
#                                                      if ios/App/scripts/fetch-sherpa-onnx.sh has fetched it
#   ruby ios/App/scripts/add-sherpa-onnx.rb --remove   take the speech engine out again (the transcription
#                                                      sources stay: they build without it)
#
# With the engine it:
#   - links and embeds Frameworks/SherpaOnnxC.xcframework (or the older sherpa-onnx + onnxruntime pair)
#   - adds App/transcription/sherpa/SherpaOnnx.swift
#   - adds the C API header path to HEADER_SEARCH_PATHS and its #import to App/App-Bridging-Header.h
#   - adds ABS_SHERPA to SWIFT_ACTIVE_COMPILATION_CONDITIONS
#
# Run `pod install` afterwards only if you normally do; this script doesn't touch the Pods project.

begin
  require 'xcodeproj'
rescue LoadError
  abort 'The xcodeproj gem is missing. It comes with CocoaPods; otherwise: gem install xcodeproj'
end
require 'pathname'

TARGET_NAME = 'Audiobookshelf'
CONDITION = 'ABS_SHERPA'
BRIDGE_BEGIN = '// >>> ABS+ sherpa-onnx (added by ios/App/scripts/add-sherpa-onnx.rb)'
BRIDGE_END = '// <<< ABS+ sherpa-onnx'
BRIDGE_BLOCK = <<~OBJC
  #{BRIDGE_BEGIN}
  #if __has_include(<SherpaOnnxC/sherpa-onnx/c-api/c-api.h>)
  #import <SherpaOnnxC/sherpa-onnx/c-api/c-api.h>
  #elif __has_include("sherpa-onnx/c-api/c-api.h")
  #import "sherpa-onnx/c-api/c-api.h"
  #endif
  #{BRIDGE_END}
OBJC

remove = ARGV.include?('--remove')

ios_app_dir = File.expand_path('..', __dir__) # ios/App
proj_path = File.join(ios_app_dir, 'App.xcodeproj')
abort "error: #{proj_path} not found" unless File.directory?(proj_path)

project = Xcodeproj::Project.open(proj_path)
target = project.targets.find { |t| t.name == TARGET_NAME }
abort "error: target #{TARGET_NAME} not found" unless target

app_group = project.main_group.children.find { |g| g.isa == 'PBXGroup' && (g.path == 'App' || g.name == 'App') }
abort "error: App group not found" unless app_group

def child_group(parent, name)
  parent.children.find { |g| g.isa == 'PBXGroup' && (g.path == name || g.name == name) } || parent.new_group(name, name)
end

def file_ref(group, file_name)
  group.files.find { |f| f.path == file_name } || group.new_reference(file_name)
end

def add_source(target, group, file_name)
  ref = file_ref(group, file_name)
  target.source_build_phase.add_file_reference(ref, true)
  ref
end

def remove_ref(target, ref)
  return unless ref
  target.build_phases.each do |phase|
    next unless phase.respond_to?(:files)
    phase.files.select { |bf| bf.file_ref == ref }.each { |bf| phase.remove_build_file(bf) }
  end
  ref.remove_from_project
end

def tokens(value)
  Array(value).join(' ').split(/\s+/).reject(&:empty?)
end

def list(value)
  case value
  when nil then []
  when Array then value.dup
  else value.to_s.split(/\s+/).reject(&:empty?)
  end
end

# ---------------------------------------------------------------- transcription sources (always)

plugins_group = child_group(app_group, 'plugins')
add_source(target, plugins_group, 'AbsTranscriber.swift') if File.exist?(File.join(ios_app_dir, 'App', 'plugins', 'AbsTranscriber.swift'))

tx_dir = File.join(ios_app_dir, 'App', 'transcription')
tx_group = child_group(app_group, 'transcription')
Dir.glob(File.join(tx_dir, '*.swift')).sort.each do |f|
  add_source(target, tx_group, File.basename(f))
  puts "source: App/transcription/#{File.basename(f)}"
end

# ---------------------------------------------------------------- the speech engine

frameworks_dir = File.join(ios_app_dir, 'Frameworks')
candidates = %w[SherpaOnnxC.xcframework sherpa-onnx.xcframework onnxruntime.xcframework]
present = candidates.select { |n| File.directory?(File.join(frameworks_dir, n)) }
sherpa_swift = File.join(tx_dir, 'sherpa', 'SherpaOnnx.swift')
use_engine = !remove && present.any? { |n| n != 'onnxruntime.xcframework' } && File.exist?(sherpa_swift)

engine_group = project.main_group.children.find { |g| g.isa == 'PBXGroup' && g.name == 'SpeechEngine' }
sherpa_group = tx_group.children.find { |g| g.isa == 'PBXGroup' && (g.path == 'sherpa' || g.name == 'sherpa') }

# Start from a clean state for the engine parts, then add what's there (keeps reruns idempotent
# and drops frameworks of an older layout)
if engine_group
  engine_group.files.dup.each { |ref| remove_ref(target, ref) }
end
if sherpa_group
  sherpa_group.files.dup.each { |ref| remove_ref(target, ref) }
end

header_paths = []
if use_engine
  engine_group ||= project.main_group.new_group('SpeechEngine')
  embed = target.copy_files_build_phases.find { |p| p.name == 'Embed Frameworks' } || target.new_copy_files_build_phase('Embed Frameworks')
  embed.symbol_dst_subfolder_spec = :frameworks
  embed.dst_path = ''
  needs_cxx = false

  present.each do |name|
    xc = File.join(frameworks_dir, name)
    ref = engine_group.new_reference("Frameworks/#{name}", :source_root)
    ref.last_known_file_type = 'wrapper.xcframework'
    ref.name = name
    target.frameworks_build_phase.add_file_reference(ref, true)
    # Dynamic framework slices (*.framework with a binary) are embedded; static libraries are only linked
    device_slice = Dir.glob(File.join(xc, 'ios-arm64')).first || Dir.glob(File.join(xc, 'ios-arm64*')).reject { |d| d.include?('simulator') }.first
    dynamic = device_slice && !Dir.glob(File.join(device_slice, '*.framework')).empty? &&
              Dir.glob(File.join(device_slice, '*.a')).empty?
    if dynamic
      bf = embed.add_file_reference(ref, true)
      bf.settings = { 'ATTRIBUTES' => %w[CodeSignOnCopy RemoveHeadersOnCopy] }
    else
      needs_cxx = true
    end
    # Header path for the bridging header's "sherpa-onnx/c-api/c-api.h" fallback
    header = Dir.glob(File.join(device_slice || xc, '**', 'sherpa-onnx', 'c-api', 'c-api.h')).first
    if header
      inc = File.expand_path('../../..', header) # the directory that holds sherpa-onnx/
      rel = Pathname.new(inc).relative_path_from(Pathname.new(ios_app_dir)).to_s
      header_paths << "\"$(PROJECT_DIR)/#{rel}\""
    end
    puts "framework: Frameworks/#{name} (#{dynamic ? 'linked + embedded' : 'linked, static'})"
  end

  sherpa_group ||= tx_group.new_group('sherpa', 'sherpa')
  add_source(target, sherpa_group, 'SherpaOnnx.swift')
  puts 'source: App/transcription/sherpa/SherpaOnnx.swift'
else
  if remove
    puts 'Speech engine removed from the project.'
  else
    puts 'Speech engine not found (run ios/App/scripts/fetch-sherpa-onnx.sh first): added the transcription sources only.'
    puts 'The app builds and syncs transcripts; starting a transcription on the phone says the engine is missing.'
  end
end

engine_group.remove_from_project if engine_group && !use_engine && engine_group.children.empty?
sherpa_group.remove_from_project if sherpa_group && !use_engine && sherpa_group.children.empty?

# ---------------------------------------------------------------- build settings

target.build_configurations.each do |config|
  bs = config.build_settings

  conds = tokens(bs['SWIFT_ACTIVE_COMPILATION_CONDITIONS']) - [CONDITION]
  conds << CONDITION if use_engine
  bs['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] = conds.join(' ')

  paths = list(bs['HEADER_SEARCH_PATHS']).reject { |p| p.include?('/Frameworks/') && p.include?('xcframework') }
  if use_engine && !header_paths.empty?
    paths.unshift('$(inherited)') unless paths.include?('$(inherited)')
    paths.concat(header_paths.uniq)
  end
  if paths.empty? || paths == ['$(inherited)']
    bs.delete('HEADER_SEARCH_PATHS')
  else
    bs['HEADER_SEARCH_PATHS'] = paths
  end

  # Static engine libraries (older layout) are C++ inside
  if use_engine && needs_cxx
    flags = list(bs['OTHER_LDFLAGS'])
    flags.unshift('$(inherited)') unless flags.include?('$(inherited)')
    flags << '-lc++' unless flags.include?('-lc++')
    bs['OTHER_LDFLAGS'] = flags
  end
end

project.save
puts "Saved #{proj_path}"

# ---------------------------------------------------------------- bridging header

bridge_setting = target.build_configurations.map { |c| c.build_settings['SWIFT_OBJC_BRIDGING_HEADER'] }.compact.first
bridge_path = bridge_setting && File.join(ios_app_dir, bridge_setting.delete('"'))
if bridge_path && File.exist?(bridge_path)
  text = File.read(bridge_path)
  stripped = text.sub(/\n?#{Regexp.escape(BRIDGE_BEGIN)}.*?#{Regexp.escape(BRIDGE_END)}\n?/m, "\n")
  stripped = stripped.sub(/\n+\z/, "\n")
  updated = use_engine ? "#{stripped}\n#{BRIDGE_BLOCK}" : stripped
  if updated != text
    File.write(bridge_path, updated)
    puts "#{use_engine ? 'Updated' : 'Cleaned'} #{bridge_setting}"
  end
else
  warn "warning: bridging header not found (SWIFT_OBJC_BRIDGING_HEADER=#{bridge_setting.inspect})" if use_engine
end

puts(use_engine ? 'Speech engine enabled (ABS_SHERPA).' : 'ABS_SHERPA is off.')
