#!/usr/bin/env ruby
# Adds the AbsPlusLiveActivity widget extension (read-along Live Activity) to App.xcodeproj.
# project.pbxproj lists every file and target explicitly, so this is done with the xcodeproj gem
# (ships with CocoaPods) instead of by hand. Every step is find-or-create: safe to run again.
#
# Usage (from ios/App):  ruby scripts/add-live-activity-target.rb

begin
  require 'xcodeproj'
rescue LoadError
  abort "The xcodeproj gem is missing. It comes with CocoaPods; otherwise: gem install xcodeproj"
end

IOS_APP_DIR  = File.expand_path('..', __dir__) # ios/App
PROJECT_PATH = File.join(IOS_APP_DIR, 'App.xcodeproj')
EXT_NAME     = 'AbsPlusLiveActivity'
EXT_DEPLOY   = '16.1'
EMBED_PHASE  = 'Embed App Extensions'

EXT_SOURCES  = %w[AbsPlusLiveActivityBundle.swift AbsReadAlongLiveActivity.swift].freeze
SHARED_FILE  = 'AbsReadAlongAttributes.swift'
PLUGIN_FILE  = 'AbsLiveActivity.swift'

$log = []
def did(msg)
  $log << msg
  puts "  + #{msg}"
end

def ok(msg)
  puts "  = #{msg}"
end

# Files must exist on disk first, or Xcode would show red references
[
  File.join(IOS_APP_DIR, EXT_NAME, 'Info.plist'),
  File.join(IOS_APP_DIR, 'Shared', 'liveactivity', SHARED_FILE),
  File.join(IOS_APP_DIR, 'App', 'plugins', PLUGIN_FILE),
  *EXT_SOURCES.map { |f| File.join(IOS_APP_DIR, EXT_NAME, f) }
].each { |p| abort "Missing file: #{p}" unless File.exist?(p) }

project = Xcodeproj::Project.open(PROJECT_PATH)
puts "Project: #{PROJECT_PATH}"

# The app target: the one application target (named "Audiobookshelf" in this project, not "App")
apps = project.native_targets.select { |t| t.product_type == 'com.apple.product-type.application' }
app = apps.find { |t| t.name == 'Audiobookshelf' } || apps.find { |t| t.name == 'App' } || apps.first
abort 'No application target found' unless app
puts "App target: #{app.name}"

# ---- groups / file references (paths relative to each group's folder) ----

def child_group(parent, path)
  g = parent.children.find { |c| c.is_a?(Xcodeproj::Project::Object::PBXGroup) && (c.path == path || c.display_name == path) }
  return g if g
  g = parent.new_group(path, path)
  did "group #{path}"
  g
end

def file_ref(group, name)
  ref = group.files.find { |f| f.path == name }
  return ref if ref
  ref = group.new_reference(name)
  did "file reference #{group.display_name}/#{name}"
  ref
end

def add_source(target, ref)
  if target.source_build_phase.files_references.include?(ref)
    ok "#{ref.path} already compiled in #{target.name}"
  else
    target.source_build_phase.add_file_reference(ref, true)
    did "compile #{ref.path} in #{target.name}"
  end
end

def system_framework(project, target, name, weak: false)
  path = "System/Library/Frameworks/#{name}.framework"
  group = project.frameworks_group
  ref = group.recursive_children.find { |c| c.is_a?(Xcodeproj::Project::Object::PBXFileReference) && c.path == path }
  unless ref
    ref = group.new_reference(path, :sdk_root)
    ref.name = "#{name}.framework"
  end
  phase = target.frameworks_build_phase
  bf = phase.files.find { |f| f.file_ref == ref }
  unless bf
    bf = phase.add_file_reference(ref, true)
    did "link #{name}.framework#{weak ? ' (optional)' : ''} in #{target.name}"
  end
  # Weak in the app: it runs on iOS 14, where ActivityKit doesn't exist
  bf.settings = { 'ATTRIBUTES' => ['Weak'] } if weak
  bf
end

main = project.main_group
shared_group = child_group(main, 'Shared')
la_group = child_group(shared_group, 'liveactivity')
shared_ref = file_ref(la_group, SHARED_FILE)

app_group = child_group(main, 'App')
plugins_group = child_group(app_group, 'plugins')
plugin_ref = file_ref(plugins_group, PLUGIN_FILE)

ext_group = child_group(main, EXT_NAME)
ext_refs = EXT_SOURCES.map { |f| file_ref(ext_group, f) }
file_ref(ext_group, 'Info.plist') # listed for editing only, never in a build phase

# ---- the extension target ----

ext = project.native_targets.find { |t| t.name == EXT_NAME }
if ext
  ok "target #{EXT_NAME} already exists"
else
  ext = project.new_target(:app_extension, EXT_NAME, :ios, EXT_DEPLOY, nil, :swift)
  did "target #{EXT_NAME} (widget extension, iOS #{EXT_DEPLOY})"
end

attrs = project.root_object.attributes['TargetAttributes'] ||= {}
attrs[ext.uuid] ||= { 'CreatedOnToolsVersion' => '15.0', 'ProvisioningStyle' => 'Automatic' }

app_configs = app.build_configurations.each_with_object({}) { |c, h| h[c.name] = c.build_settings }
fallback = app_configs['Release'] || app_configs.values.first

ext.build_configurations.each do |cfg|
  a = app_configs[cfg.name] || fallback
  s = cfg.build_settings
  base_id = a['PRODUCT_BUNDLE_IDENTIFIER']
  abort "App target has no PRODUCT_BUNDLE_IDENTIFIER for #{cfg.name}" unless base_id
  s['PRODUCT_BUNDLE_IDENTIFIER'] = "#{base_id}.LiveActivity"
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['INFOPLIST_FILE'] = "#{EXT_NAME}/Info.plist"
  s['GENERATE_INFOPLIST_FILE'] = 'NO'
  s['IPHONEOS_DEPLOYMENT_TARGET'] = EXT_DEPLOY
  s['SDKROOT'] = 'iphoneos'
  s['SWIFT_VERSION'] = a['SWIFT_VERSION'] || '5.0'
  s['TARGETED_DEVICE_FAMILY'] = a['TARGETED_DEVICE_FAMILY'] || '1,2'
  # The extension's version must match the app's, or App Store validation complains
  s['MARKETING_VERSION'] = a['MARKETING_VERSION'] if a['MARKETING_VERSION']
  s['CURRENT_PROJECT_VERSION'] = a['CURRENT_PROJECT_VERSION'] if a['CURRENT_PROJECT_VERSION']
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['DEVELOPMENT_TEAM'] = a['DEVELOPMENT_TEAM'] if a['DEVELOPMENT_TEAM'] && !s['DEVELOPMENT_TEAM']
  s['SKIP_INSTALL'] = 'YES'
  s['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
  s['SWIFT_EMIT_LOC_STRINGS'] = 'YES'
  puts "  ~ #{EXT_NAME} #{cfg.name}: bundle id #{s['PRODUCT_BUNDLE_IDENTIFIER']}"
end

ext_refs.each { |r| add_source(ext, r) }
add_source(ext, shared_ref)
%w[WidgetKit SwiftUI ActivityKit].each { |f| system_framework(project, ext, f) }

# ---- the app target ----

add_source(app, shared_ref)
add_source(app, plugin_ref)
system_framework(project, app, 'ActivityKit', weak: true)

unless app.dependencies.any? { |d| d.target == ext }
  app.add_dependency(ext)
  did "#{app.name} depends on #{EXT_NAME}"
end

embed = app.copy_files_build_phases.find { |p| p.symbol_dst_subfolder_spec == :plug_ins }
unless embed
  embed = app.new_copy_files_build_phase(EMBED_PHASE)
  embed.symbol_dst_subfolder_spec = :plug_ins
  embed.dst_path = ''
  did "build phase '#{EMBED_PHASE}' in #{app.name}"
end
# Right after Resources, before the CocoaPods script phases (avoids Xcode's build-cycle error)
phases = app.build_phases
res_idx = phases.index(app.resources_build_phase)
if res_idx && phases.index(embed) != res_idx + 1
  phases.delete(embed)
  phases.insert(phases.index(app.resources_build_phase) + 1, embed)
end
unless embed.files_references.include?(ext.product_reference)
  bf = embed.add_file_reference(ext.product_reference, true)
  bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  did "embed #{ext.product_reference.path} in #{app.name}"
end

project.save

puts
if $log.empty?
  puts 'Nothing to do: everything was already in place.'
else
  puts "Done (#{$log.size} change#{$log.size == 1 ? '' : 's'}), saved #{PROJECT_PATH}"
end
puts <<~NEXT

  Next steps:
    1. cd ios/App && pod install        (re-integrates CocoaPods with the changed project)
    2. open App.xcworkspace             (the workspace, not App.xcodeproj)
    3. Target #{EXT_NAME} > Signing & Capabilities: pick your team (bundle id <app id>.LiveActivity)
    4. In the app's Info.plist add NSSupportsLiveActivities = YES, and register AbsLiveActivity
       in MyViewController.swift (bridge?.registerPluginInstance(AbsLiveActivity()))
    5. Build and run on an iPhone with iOS 16.1+ (Dynamic Island needs iPhone 14 Pro or later)
NEXT
