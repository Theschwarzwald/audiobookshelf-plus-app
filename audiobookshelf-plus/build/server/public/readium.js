(()=>{var mh=Object.defineProperty;var gt=(n,t)=>()=>(n&&(t=n(n=0)),t);var vt=(n,t)=>{for(var e in t)mh(n,e,{get:t[e],enumerable:!0})};var oi,p=gt(()=>{Object.hasOwn||(Object.hasOwn=(n,t)=>Object.prototype.hasOwnProperty.call(n,t));oi=(n,t,e)=>{n[t]||Object.defineProperty(n,t,{value:e,configurable:!0,writable:!0})};oi(Array.prototype,"findLast",function(n,t){for(let e=this.length-1;e>=0;e--)if(n.call(t,this[e],e,this))return this[e]});oi(Array.prototype,"findLastIndex",function(n,t){for(let e=this.length-1;e>=0;e--)if(n.call(t,this[e],e,this))return e;return-1});oi(Array.prototype,"at",function(n){return n=Math.trunc(n)||0,n<0&&(n+=this.length),n<0||n>=this.length?void 0:this[n]});oi(String.prototype,"at",function(n){return n=Math.trunc(n)||0,n<0&&(n+=this.length),n<0||n>=this.length?void 0:this[n]});oi(String.prototype,"replaceAll",function(n,t){return typeof n=="string"?this.split(n).join(t):this.replace(n,t)});typeof globalThis.structuredClone!="function"&&(globalThis.structuredClone=n=>JSON.parse(JSON.stringify(n)))});var ol={};vt(ol,{default:()=>Sd});var Sd,nl=gt(()=>{p();Sd=`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017\u20132026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickae\u0308l Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

@-ms-viewport{
  width:device-width;
}

@viewport{
  width:device-width;
  zoom:1;
}

:root{

  --RS__sans-serif-ja-v:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', '\u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDGothic', 'Yu Gothic', '\uFF2D\uFF33\u30B4\u30B7\u30C3\u30AF', 'MS Gothic', sans-serif;

  --RS__serif-ja-v:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDMincho', 'Yu Mincho', '\uFF2D\uFF33\u660E\u671D', 'MS Mincho', serif;

  --RS__sans-serif-ja:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', '\u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDPGothic', 'Yu Gothic', '\uFF2D\uFF33 \uFF30\u30B4\u30B7\u30C3\u30AF', 'MS PGothic', sans-serif;

  --RS__serif-ja:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDPMincho', 'Yu Mincho', '\uFF2D\uFF33 \uFF30\u660E\u671D', 'MS PMincho', serif;

  --RS__monospaceTf:ui-monospace, 'Andale Mono', 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;

  --RS__humanistTf:Seravek, Calibri, 'Gill Sans Nova', Roboto, Ubuntu, 'DejaVu Sans', source-sans-pro, sans-serif;

  --RS__sansTf:-ui-sans-serif, -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Liberation Sans', Arial, sans-serif;

  --RS__modernTf:Athelas, Constantia, Charter, 'Bitstream Charter', Cambria, 'Georgia Pro', Georgia, serif;

  --RS__oldStyleTf:'Iowan Old Style', Sitka, 'Sitka Text', Palatino, 'Book Antiqua', 'URW Palladio L', P052, serif;

  --RS__zh-HK-lineHeightCompensation:1.167;

  --RS__zh-HK-baseFontFamily:'\u65B9\u9AD4', 'PingFang HK', '\u65B9\u9AD4', 'PingFang TC', '\u9ED1\u9AD4', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-TW-lineHeightCompensation:1.167;

  --RS__zh-TW-baseFontFamily:'\u65B9\u9AD4', 'PingFang TC', '\u9ED1\u9AD4', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-Hant-lineHeightCompensation:1.167;

  --RS__zh-Hant-baseFontFamily:'\u65B9\u9AD4', 'PingFang TC', '\u9ED1\u9AD4', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-lineHeightCompensation:1.167;

  --RS__zh-baseFontFamily:'\u65B9\u4F53', 'PingFang SC', '\u9ED1\u4F53', 'Heiti SC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK SC', sans-serif;

  --RS__th-lineHeightCompensation:1.067;

  --RS__th-baseFontFamily:Thonburi, 'Leelawadee UI', 'Cordia New', Roboto, Noto, 'Noto Sans Thai', sans-serif;

  --RS__te-baseFontFamily:'Kohinoor Telugu', 'Telugu Sangam MN', 'Nirmala UI', Gautami, Roboto, Noto, 'Noto Sans Telugu', sans-serif;

  --RS__ta-lineHeightCompensation:1.067;

  --RS__ta-baseFontFamily:'Tamil Sangam MN', 'Nirmala UI', Latha, Roboto, Noto, 'Noto Sans Tamil', sans-serif;

  --RS__si-lineHeightCompensation:1.167;

  --RS__si-baseFontFamily:'Sinhala Sangam MN', 'Nirmala UI', 'Iskoola Pota', Roboto, Noto, 'Noto Sans Sinhala', sans-serif;

  --RS__pa-lineHeightCompensation:1.1;

  --RS__pa-baseFontFamily:'Gurmukhi MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Gurmukhi', sans-serif;

  --RS__or-lineHeightCompensation:1.167;

  --RS__or-baseFontFamily:'Oriya Sangam MN', 'Nirmala UI', Kalinga, Roboto, Noto, 'Noto Sans Oriya', sans-serif;

  --RS__ml-lineHeightCompensation:1.067;

  --RS__ml-baseFontFamily:'Malayalam Sangam MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Malayalam', sans-serif;

  --RS__lo-baseFontFamily:'Lao Sangam MN', 'Leelawadee UI', 'Lao UI', Roboto, Noto, 'Noto Sans Lao', sans-serif;

  --RS__ko-lineHeightCompensation:1.167;

  --RS__ko-baseFontFamily:'Nanum Gothic', 'Apple SD Gothic Neo', 'Malgun Gothic', Roboto, Noto, 'Noto Sans CJK KR', sans-serif;

  --RS__kn-lineHeightCompensation:1.1;

  --RS__kn-baseFontFamily:'Kannada Sangam MN', 'Nirmala UI', Tunga, Roboto, Noto, 'Noto Sans Kannada', sans-serif;

  --RS__km-lineHeightCompensation:1.067;

  --RS__km-baseFontFamily:'Khmer Sangam MN', 'Leelawadee UI', 'Khmer UI', Roboto, Noto, 'Noto Sans Khmer', sans-serif;

  --RS__ja-lineHeightCompensation:1.167;

  --RS__ja-baseFontFamily:YuGothic, 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo UI', 'MS Gothic', Roboto, Noto, 'Noto Sans CJK JP', sans-serif;

  --RS__iu-baseFontFamily:'Euphemia UCAS', Euphemia, Roboto, Noto, 'Noto Sans Canadian Aboriginal', sans-serif;

  --RS__hy-baseFontFamily:Mshtakan, Sylfaen, Roboto, Noto, 'Noto Serif Armenian', serif;

  --RS__hi-lineHeightCompensation:1.1;

  --RS__hi-baseFontFamily:'Kohinoor Devanagari', 'Devanagari Sangam MN', Kokila, 'Nirmala UI', Roboto, Noto, 'Noto Sans Devanagari', sans-serif;

  --RS__he-lineHeightCompensation:1.1;

  --RS__he-baseFontFamily:'New Peninim MT', 'Arial Hebrew', Gisha, 'Times New Roman', Roboto, Noto, 'Noto Sans Hebrew', sans-serif;

  --RS__gu-lineHeightCompensation:1.167;

  --RS__gu-baseFontFamily:'Gujarati Sangam MN', 'Nirmala UI', Shruti, Roboto, Noto, 'Noto Sans Gujarati', sans-serif;

  --RS__fa-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__chr-lineHeightCompensation:1.167;

  --RS__chr-baseFontFamily:'Plantagenet Cherokee', Roboto, Noto, 'Noto Sans Cherokee';

  --RS__bo-baseFontFamily:Kailasa, 'Microsoft Himalaya', Roboto, Noto, 'Noto Sans Tibetan', sans-serif;

  --RS__bn-lineHeightCompensation:1.067;

  --RS__bn-baseFontFamily:'Kohinoor Bangla', 'Bangla Sangam MN', Vrinda, Roboto, Noto, 'Noto Sans Bengali', sans-serif;

  --RS__ar-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__am-lineHeightCompensation:1.167;

  --RS__am-baseFontFamily:Kefa, Nyala, Roboto, Noto, 'Noto Sans Ethiopic', serif;

  --RS__latin-lineHeightCompensation:1;

  --RS__latin-baseFontFamily:var(--RS__oldStyleTf);
  --RS__baseFontFamily:var(--RS__latin-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__latin-lineHeightCompensation);
  --RS__baseLineHeight:calc(1.5 * var(--RS__lineHeightCompensation));

  --RS__selectionTextColor:inherit;

  --RS__selectionBackgroundColor:#b4d8fe;

  --RS__visitedColor:#551A8B;

  --RS__linkColor:#0000EE;

  --RS__textColor:#121212;

  --RS__backgroundColor:#FFFFFF;
  color:var(--RS__textColor) !important;

  background-color:var(--RS__backgroundColor) !important;
}

::-moz-selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

::selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

html{
  font-family:var(--RS__baseFontFamily);
  line-height:1.6;
  line-height:var(--RS__baseLineHeight);
  text-rendering:optimizelegibility;
}

h1, h2, h3{
  line-height:normal;
}

:lang(ja),
:lang(zh),
:lang(ko){
  word-wrap:break-word;
  -webkit-line-break:strict;
  -epub-line-break:strict;
  line-break:strict;
}

math{
  font-family:"Latin Modern Math", "STIX Two Math", "XITS Math", "STIX Math", "Libertinus Math", "TeX Gyre Termes Math", "TeX Gyre Bonum Math", "TeX Gyre Schola", "DejaVu Math TeX Gyre", "TeX Gyre Pagella Math", "Asana Math", "Cambria Math", "Lucida Bright Math", "Minion Math", STIXGeneral, STIXSizeOneSym, Symbol, "Times New Roman", serif;
}

:lang(am){
  --RS__baseFontFamily:var(--RS__am-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__am-lineHeightCompensation);
}

:lang(ar){
  --RS__baseFontFamily:var(--RS__ar-baseFontFamily);
}

:lang(bn){
  --RS__baseFontFamily:var(--RS__bn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__bn-lineHeightCompensation);
}

:lang(bo){
  --RS__baseFontFamily:var(--RS__bo-baseFontFamily);
}

:lang(chr){
  --RS__baseFontFamily:var(--RS__chr-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__chr-lineHeightCompensation);
}

:lang(fa){
  --RS__baseFontFamily:var(--RS__fa-baseFontFamily);
}

:lang(gu){
  --RS__baseFontFamily:var(--RS__gu-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__gu-lineHeightCompensation);
}

:lang(he){
  --RS__baseFontFamily:var(--RS__he-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__he-lineHeightCompensation);
}

:lang(hi){
  --RS__baseFontFamily:var(--RS__hi-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__hi-lineHeightCompensation);
}

:lang(hy){
  --RS__baseFontFamily:var(--RS__hy-baseFontFamily);
}

:lang(iu){
  --RS__baseFontFamily:var(--RS__iu-baseFontFamily);
}

:lang(ja){
  --RS__baseFontFamily:var(--RS__ja-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ja-lineHeightCompensation);
}

:lang(km){
  --RS__baseFontFamily:var(--RS__km-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__km-lineHeightCompensation);
}

:lang(kn){
  --RS__baseFontFamily:var(--RS__kn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__kn-lineHeightCompensation);
}

:lang(ko){
  --RS__baseFontFamily:var(--RS__ko-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ko-lineHeightCompensation);
}

:lang(lo){
  --RS__baseFontFamily:var(--RS__lo-baseFontFamily);
}

:lang(ml){
  --RS__baseFontFamily:var(--RS__ml-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ml-lineHeightCompensation);
}

:lang(or){
  --RS__baseFontFamily:var(--RS__or-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__or-lineHeightCompensation);
}

:lang(pa){
  --RS__baseFontFamily:var(--RS__pa-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__pa-lineHeightCompensation);
}

:lang(si){
  --RS__baseFontFamily:var(--RS__si-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__si-lineHeightCompensation);
}

:lang(ta){
  --RS__baseFontFamily:var(--RS__ta-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ta-lineHeightCompensation);
}

:lang(te){
  --RS__baseFontFamily:var(--RS__te-baseFontFamily);
}

:lang(th){
  --RS__baseFontFamily:var(--RS__th-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__th-lineHeightCompensation);
}

:lang(zh){
  --RS__baseFontFamily:var(--RS__zh-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-lineHeightCompensation);
}

:lang(zh-Hant){
  --RS__baseFontFamily:var(--RS__zh-Hant-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-Hant-lineHeightCompensation);
}

:lang(zh-TW){
  --RS__baseFontFamily:var(--RS__zh-TW-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-TW-lineHeightCompensation);
}

:lang(zh-HK){
  --RS__baseFontFamily:var(--RS__zh-HK-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-HK-lineHeightCompensation);
}

body{
  widows:2;
  orphans:2;
}

figcaption, th, td{
  widows:1;
  orphans:1;
}

h2, h3, h4, h5, h6, dt,
hr, caption{
  -webkit-column-break-after:avoid;
  page-break-after:avoid;
  break-after:avoid;
}

h1, h2, h3, h4, h5, h6, dt,
figure, tr{
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

body{
  -webkit-hyphenate-character:"\\002D";
  -moz-hyphenate-character:"\\002D";
  -ms-hyphenate-character:"\\002D";
  hyphenate-character:"\\002D";
  -webkit-hyphenate-limit-lines:3;
  -ms-hyphenate-limit-lines:3;
  hyphenate-limit-lines:3;
}

h1, h2, h3, h4, h5, h6, dt,
figcaption, pre, caption, address,
center, code, var{
  -ms-hyphens:none;
  -moz-hyphens:none;
  -webkit-hyphens:none;
  -epub-hyphens:none;
  hyphens:none;
}

body{
  font-variant-numeric:oldstyle-nums proportional-nums;
}

:lang(ja) body,
:lang(zh) body,
:lang(ko) body{
  font-variant-numeric:lining-nums proportional-nums;
}

h1, h2, h3, h4, h5, h6, dt{
  font-variant-numeric:lining-nums proportional-nums;
}

table{
  font-variant-numeric:lining-nums tabular-nums;
}

code, var{
  font-variant-ligatures:none;
  font-variant-numeric:lining-nums tabular-nums slashed-zero;
}

rt{
  font-variant-east-asian:ruby;
}

:lang(ar){
  font-variant-ligatures:common-ligatures;
}

:lang(ko){
  font-kerning:normal;
}

hr{
  color:inherit;
  border-color:currentcolor;
}

table, th, td{
  border-color:currentcolor;
}

figure, blockquote{
  margin:1em 5%;
}

ul, ol{
  padding-left:5%;
}

dd{
  margin-left:5%;
}

pre{
  white-space:pre-wrap;
  -ms-tab-size:2;
  -moz-tab-size:2;
  -webkit-tab-size:2;
  tab-size:2;
}

abbr[title], acronym[title]{
  text-decoration:dotted underline;
}

nobr wbr{
  white-space:normal;
}

ruby > rt, ruby > rp{
  -webkit-user-select:none;
  -moz-user-select:none;
  -ms-user-select:none;
  user-select:none;
}

*:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)),
*:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)),
*:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)),
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) cite, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) dfn, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) em, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) i,
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) cite, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) dfn, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) em, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) i,
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) cite, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) dfn, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) em, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) i{
  font-style:normal;
}

:lang(ja) a,
:lang(zh) a,
:lang(ko) a{
  text-decoration:none;
}

:root{
  --RS__maxMediaWidth:100%;
  --RS__maxMediaHeight:95vh;
  --RS__boxSizingMedia:border-box;
  --RS__boxSizingTable:border-box;
}

a, a span, span a, h1, h2, h3, h4, h5, h6{
  word-wrap:break-word;
}

div{
  max-width:var(--RS__maxMediaWidth);
}

img, svg|svg, video{
  object-fit:contain;

  width:auto;
  height:auto;
  max-width:var(--RS__maxMediaWidth);
  max-height:var(--RS__maxMediaHeight) !important;
  box-sizing:var(--RS__boxSizingMedia);
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

@supports (zoom: 1) and (not ((-webkit-column-axis: horizontal) and (-webkit-column-progression: normal))){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] img,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] svg|svg,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] video{
    zoom:calc(100% / var(--USER__fontSize));
  }
}

audio{
    max-width:100%;
    -webkit-column-break-inside:avoid;
    page-break-inside:avoid;
    break-inside:avoid;
  }

table{
  max-width:var(--RS__maxMediaWidth);
  box-sizing:var(--RS__boxSizingTable);
}`});var rl={};vt(rl,{default:()=>yd});var yd,sl=gt(()=>{p();yd=`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017\u20132026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickae\u0308l Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{
  --RS__compFontFamily:var(--RS__baseFontFamily);
  --RS__codeFontFamily:var(--RS__monospaceTf);

  --RS__typeScale:1.125;
  --RS__baseFontSize:100%;

  --RS__flowSpacing:1.5rem;
  --RS__paraSpacing:0;
  --RS__paraIndent:1em;

  --RS__linkColor:#0000EE;
  --RS__visitedColor:#551A8B;

  --RS__primaryColor:;
  --RS__secondaryColor:;
}

body{
  font-size:var(--RS__baseFontSize);
  text-align:justify;
}

h1, h2, h3, h4, h5, h6{
  font-family:var(--RS__compFontFamily);
  text-align:right;
}

blockquote, figure, p, pre,
aside, footer, form, hr{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
}

p{
  margin-top:var(--RS__paraSpacing);
  margin-bottom:var(--RS__paraSpacing);
  text-indent:var(--RS__paraIndent);
}

h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p,
hr + p{
  text-indent:0;
}

pre{
  font-family:var(--RS__codeFontFamily);
}

code, kbd, samp, tt{
  font-family:var(--RS__codeFontFamily);
}

sub, sup{
  position:relative;
  font-size:67.5%;
  line-height:1;
}

sub{
  bottom:-0.2ex;
}

sup{
  bottom:0;
}

:link{
  color:var(--RS__linkColor);
}

:visited{
  color:var(--RS__visitedColor);
}

h1{
  margin-top:calc(var(--RS__flowSpacing) * 2);
  margin-bottom:calc(var(--RS__flowSpacing) * 2);
  font-size:calc(((1em * var(--RS__typeScale)) * var(--RS__typeScale)) * var(--RS__typeScale));
}

h2{
  margin-top:calc(var(--RS__flowSpacing) * 2);
  margin-bottom:var(--RS__flowSpacing);
  font-size:calc((1em * var(--RS__typeScale)) * var(--RS__typeScale));
}

h3{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:calc(1em * var(--RS__typeScale));
}

h4{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:1em;
}

h5{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:smaller;
}

h6{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:0;
  font-size:smaller;
  font-weight:normal;
}

dl, ol, ul{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
}

table{
  margin:var(--RS__flowSpacing) 0;
  border:1px solid currentcolor;
  border-collapse:collapse;
  empty-cells:show;
}

thead, tbody, tfoot, table > tr{
  vertical-align:top;
}

th{
  text-align:initial;
}

th, td{
  padding:4px;
  border:1px solid currentcolor;
}`});var al={};vt(al,{default:()=>_d});var _d,ll=gt(()=>{p();_d=`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017\u20132026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickae\u0308l Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{

  --RS__viewportWidth:100%;

  --RS__pageGutter:0;

  --RS__defaultLineLength:100%;

  --RS__colGap:0;

  --RS__colCount:1;

  --RS__colWidth:100vw;
}

@page{
  margin:0 !important;
}

:root{
  position:relative;

  -webkit-column-width:var(--RS__colWidth);
  -moz-column-width:var(--RS__colWidth);
  column-width:var(--RS__colWidth);
  -webkit-column-count:var(--RS__colCount);
  -moz-column-count:var(--RS__colCount);
  column-count:var(--RS__colCount);

  -webkit-column-gap:var(--RS__colGap);
  -moz-column-gap:var(--RS__colGap);
  column-gap:var(--RS__colGap);
  -moz-column-fill:auto;
  column-fill:auto;
  width:var(--RS__viewportWidth);
  height:100vh;
  max-width:var(--RS__viewportWidth);
  max-height:100vh;
  min-width:var(--RS__viewportWidth);
  min-height:100vh;
  padding:0 !important;
  margin:0 !important;
  font-size:1rem !important;
  box-sizing:border-box;
  -webkit-touch-callout:none;
}

body{
  width:100%;
  max-width:var(--RS__defaultLineLength) !important;
  margin:0 auto !important;
  box-sizing:border-box;
}

:root:not([style*="readium-scroll-on"]) body{
  padding:0 var(--RS__pageGutter) !important;
}

:root:not([style*="readium-noOverflow-on"]) body{
  overflow:hidden;
}

@supports (overflow: clip){

   :root:not([style*="readium-noOverflow-on"]){
      overflow:clip;
   }

   :root:not([style*="readium-noOverflow-on"]) body{
      overflow:clip;
      overflow-clip-margin:content-box;
   }
}

:root[style*="readium-scroll-on"]{
  -webkit-columns:auto auto !important;
  -moz-columns:auto auto !important;
  columns:auto auto !important;
  width:auto !important;
  height:auto !important;
  max-width:none !important;
  max-height:none !important;
  min-width:0 !important;
  min-height:0 !important;
}

:root[style*="readium-scroll-on"] body{
  max-width:var(--RS__defaultLineLength) !important;
  box-sizing:border-box !important;
}

:root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
  overflow:auto;
}

@supports (overflow: clip){

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]){
     overflow:auto;
  }

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
     overflow:clip;
  }
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingTop"] body{
  padding-top:var(--RS__scrollPaddingTop) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingBottom"] body{
  padding-bottom:var(--RS__scrollPaddingBottom) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingLeft"] body{
  padding-left:var(--RS__scrollPaddingLeft) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingRight"] body{
  padding-right:var(--RS__scrollPaddingRight) !important;
}

:root[style*="--USER__backgroundColor"]{
  background-color:var(--USER__backgroundColor) !important;
}

:root[style*="--USER__backgroundColor"] *{
  background-color:transparent !important;
}

:root[style*="--USER__textColor"]{
  color:var(--USER__textColor) !important;
}

:root[style*="--USER__textColor"] *:not(a){
  color:inherit !important;
  background-color:transparent !important;
  border-color:currentcolor !important;
}

:root[style*="--USER__textColor"] svg text{
  fill:currentcolor !important;
  stroke:none !important;
}

:root[style*="--USER__linkColor"] a:link,
:root[style*="--USER__linkColor"] a:link *{
  color:var(--USER__linkColor) !important;
}

:root[style*="--USER__visitedColor"] a:visited,
:root[style*="--USER__visitedColor"] a:visited *{
  color:var(--USER__visitedColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::-moz-selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__colCount"]{
  -webkit-column-count:var(--USER__colCount);
  -moz-column-count:var(--USER__colCount);
  column-count:var(--USER__colCount);

  --RS__colWidth:auto;
}

:root[style*="--USER__colCount: 0"],
:root[style*="--USER__colCount:0"]{
  -webkit-column-count:1;
  -moz-column-count:1;
  column-count:1;
}

:root[style*="--USER__colCount: 0"],
:root[style*="--USER__colCount:0"],
:root[style*="--USER__colCount: 1"],
:root[style*="--USER__colCount:1"]{
  --RS__colWidth:100vw;
}

:root[style*="--USER__lineLength"] body{
    max-width:var(--USER__lineLength) !important;
  }

:root[style*="--USER__textAlign"]{
  text-align:var(--USER__textAlign);
}

:root[style*="--USER__textAlign"] body,
:root[style*="--USER__textAlign"] p:not(
  blockquote p,
  figcaption p,
  header p,
  hgroup p,
  :root[style*="readium-experimentalHeaderFiltering-on"] p[class*="title"],
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > h1 + p,
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > p:has(+ h1)
),
:root[style*="--USER__textAlign"] li,
:root[style*="--USER__textAlign"] dd{
  text-align:var(--USER__textAlign) !important;
  -moz-text-align-last:auto !important;
  -epub-text-align-last:auto !important;
  text-align-last:auto !important;
}

:root[style*="--USER__fontFamily"]{
  font-family:var(--USER__fontFamily) !important;
}

:root[style*="--USER__fontFamily"] *{
  font-family:revert !important;
}

:root:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] body{
  zoom:var(--USER__fontSize) !important;
}

:root:not([style*="readium-deprecatedFontSize-on"])[style*="readium-iOSPatch-on"][style*="--USER__fontSize"] body{
  -webkit-text-size-adjust:var(--USER__fontSize) !important;
}

@supports selector(figure:has(> img)){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> img),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> video),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> svg),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> canvas),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> iframe),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> audio),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> img:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> video:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> svg:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> canvas:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> iframe:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> audio:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] table{
    zoom:calc(100% / var(--USER__fontSize)) !important;
  }

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figcaption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] caption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] td,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] th{
    zoom:var(--USER__fontSize) !important;
  }
}

@supports not (zoom: 1){

  :root[style*="--USER__fontSize"]{
    font-size:var(--USER__fontSize) !important;
  }
}

:root[style*="readium-deprecatedFontSize-on"][style*="--USER__fontSize"]{
  font-size:var(--USER__fontSize) !important;
}

:root[style*="--USER__lineHeight"]{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__lineHeight"] body,
:root[style*="--USER__lineHeight"] p,
:root[style*="--USER__lineHeight"] li,
:root[style*="--USER__lineHeight"] div{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__paraSpacing"] p{
  margin-top:var(--USER__paraSpacing) !important;
  margin-bottom:var(--USER__paraSpacing) !important;
}

:root[style*="--USER__paraIndent"] p:not(
  blockquote p,
  figcaption p,
  header p,
  hgroup p,
  :root[style*="readium-experimentalHeaderFiltering-on"] p[class*="title"],
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > h1 + p,
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > p:has(+ h1)
){
  text-indent:var(--USER__paraIndent) !important;
}

:root[style*="--USER__paraIndent"] p *{
  text-indent:0 !important;
}

:root[style*="--USER__wordSpacing"] h1,
:root[style*="--USER__wordSpacing"] h2,
:root[style*="--USER__wordSpacing"] h3,
:root[style*="--USER__wordSpacing"] h4,
:root[style*="--USER__wordSpacing"] h5,
:root[style*="--USER__wordSpacing"] h6,
:root[style*="--USER__wordSpacing"] p,
:root[style*="--USER__wordSpacing"] li,
:root[style*="--USER__wordSpacing"] div,
:root[style*="--USER__wordSpacing"] dt,
:root[style*="--USER__wordSpacing"] dd{
  word-spacing:var(--USER__wordSpacing) !important;
}

:root[style*="--USER__ligatures"]{
  font-variant-ligatures:var(--USER__ligatures) !important;
}

:root[style*="--USER__ligatures"] *{
  font-variant-ligatures:inherit !important;
}

:root[style*="--USER__fontWeight"] body{
  font-weight:var(--USER__fontWeight) !important;
}

:root[style*="--USER__fontWeight"] b,
:root[style*="--USER__fontWeight"] strong{
  font-weight:bolder;
}

:root[style*="--USER__fontWidth"] body{
  font-stretch:var(--USER__fontWidth) !important;
}

:root[style*="--USER__fontOpticalSizing"] body{
  font-optical-sizing:var(--USER__fontOpticalSizing) !important;
}

:root[style*="readium-blend-on"] svg,
:root[style*="readium-blend-on"] img{
  background-color:transparent !important;
  mix-blend-mode:multiply !important;
}

:root[style*="--USER__darkenImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) !important;
  filter:brightness(var(--USER__darkenImages)) !important;
}

:root[style*="readium-darken-on"] img{
  -webkit-filter:brightness(80%) !important;
  filter:brightness(80%) !important;
}

:root[style*="--USER__invertImages"] img{
  -webkit-filter:invert(var(--USER__invertImages)) !important;
  filter:invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-invert-on"] img{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="--USER__darkenImages"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
  filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-darken-on"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(80%) invert(var(--USER__invertImages)) !important;
  filter:brightness(80%) invert(var(--USER__invertImages)) !important;
}

:root[style*="--USER__darkenImages"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
  filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
}

:root[style*="readium-darken-on"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(80%) invert(100%) !important;
  filter:brightness(80%) invert(100%) !important;
}

:root[style*="--USER__invertGaiji"] img[class*="gaiji"]{
  -webkit-filter:invert(var(--USER__invertGaiji)) !important;
  filter:invert(var(--USER__invertGaiji)) !important;
}

:root[style*="readium-invertGaiji-on"] img[class*="gaiji"]{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="readium-normalize-on"]{
  --USER__typeScale:1.2;
}

:root[style*="readium-normalize-on"] p,
:root[style*="readium-normalize-on"] li,
:root[style*="readium-normalize-on"] div,
:root[style*="readium-normalize-on"] pre,
:root[style*="readium-normalize-on"] dd{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] h1{
  font-size:1.75rem !important;
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h2{
  font-size:1.5rem !important;
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h3{
  font-size:1.25rem !important;
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h4,
:root[style*="readium-normalize-on"] h5,
:root[style*="readium-normalize-on"] h6{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] small{
  font-size:smaller !important;
}

:root[style*="readium-normalize-on"] sub,
:root[style*="readium-normalize-on"] sup{
  font-size:67.5% !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h1{
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h2{
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h3{
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-iPadOSPatch-on"] body{
  -webkit-text-size-adjust:none;
}

:root[style*="readium-iPadOSPatch-on"] p, 
:root[style*="readium-iPadOSPatch-on"] h1, 
:root[style*="readium-iPadOSPatch-on"] h2, 
:root[style*="readium-iPadOSPatch-on"] h3, 
:root[style*="readium-iPadOSPatch-on"] h4, 
:root[style*="readium-iPadOSPatch-on"] h5, 
:root[style*="readium-iPadOSPatch-on"] h6, 
:root[style*="readium-iPadOSPatch-on"] li, 
:root[style*="readium-iPadOSPatch-on"] th, 
:root[style*="readium-iPadOSPatch-on"] td, 
:root[style*="readium-iPadOSPatch-on"] dt, 
:root[style*="readium-iPadOSPatch-on"] dd, 
:root[style*="readium-iPadOSPatch-on"] pre, 
:root[style*="readium-iPadOSPatch-on"] address, 
:root[style*="readium-iPadOSPatch-on"] details, 
:root[style*="readium-iPadOSPatch-on"] summary,
:root[style*="readium-iPadOSPatch-on"] figcaption,
:root[style*="readium-iPadOSPatch-on"] div:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)),
:root[style*="readium-iPadOSPatch-on"] aside:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)){
  -webkit-text-zoom:reset;
}

:root[style*="readium-iPadOSPatch-on"] abbr, 
:root[style*="readium-iPadOSPatch-on"] b, 
:root[style*="readium-iPadOSPatch-on"] bdi, 
:root[style*="readium-iPadOSPatch-on"] bdo, 
:root[style*="readium-iPadOSPatch-on"] cite, 
:root[style*="readium-iPadOSPatch-on"] code, 
:root[style*="readium-iPadOSPatch-on"] dfn, 
:root[style*="readium-iPadOSPatch-on"] em, 
:root[style*="readium-iPadOSPatch-on"] i, 
:root[style*="readium-iPadOSPatch-on"] kbd, 
:root[style*="readium-iPadOSPatch-on"] mark, 
:root[style*="readium-iPadOSPatch-on"] q, 
:root[style*="readium-iPadOSPatch-on"] rp, 
:root[style*="readium-iPadOSPatch-on"] rt, 
:root[style*="readium-iPadOSPatch-on"] ruby, 
:root[style*="readium-iPadOSPatch-on"] s, 
:root[style*="readium-iPadOSPatch-on"] samp, 
:root[style*="readium-iPadOSPatch-on"] small, 
:root[style*="readium-iPadOSPatch-on"] span, 
:root[style*="readium-iPadOSPatch-on"] strong, 
:root[style*="readium-iPadOSPatch-on"] sub, 
:root[style*="readium-iPadOSPatch-on"] sup, 
:root[style*="readium-iPadOSPatch-on"] time, 
:root[style*="readium-iPadOSPatch-on"] u, 
:root[style*="readium-iPadOSPatch-on"] var{
  -webkit-text-zoom:normal;
}

:root[style*="readium-iPadOSPatch-on"] p:not(:has(b, cite, em, i, q, s, small, span, strong)):first-line{
  -webkit-text-zoom:normal;
}`});var hl={};vt(hl,{default:()=>bd});var bd,cl=gt(()=>{p();bd=`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017\u20132026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickae\u0308l Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

@-ms-viewport{
  width:device-width;
}

@viewport{
  width:device-width;
  zoom:1;
}

:root{

  --RS__sans-serif-ja-v:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', '\u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDGothic', 'Yu Gothic', '\uFF2D\uFF33\u30B4\u30B7\u30C3\u30AF', 'MS Gothic', sans-serif;

  --RS__serif-ja-v:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDMincho', 'Yu Mincho', '\uFF2D\uFF33\u660E\u671D', 'MS Mincho', serif;

  --RS__sans-serif-ja:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', '\u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDPGothic', 'Yu Gothic', '\uFF2D\uFF33 \uFF30\u30B4\u30B7\u30C3\u30AF', 'MS PGothic', sans-serif;

  --RS__serif-ja:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDPMincho', 'Yu Mincho', '\uFF2D\uFF33 \uFF30\u660E\u671D', 'MS PMincho', serif;

  --RS__monospaceTf:ui-monospace, 'Andale Mono', 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;

  --RS__humanistTf:Seravek, Calibri, 'Gill Sans Nova', Roboto, Ubuntu, 'DejaVu Sans', source-sans-pro, sans-serif;

  --RS__sansTf:-ui-sans-serif, -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Liberation Sans', Arial, sans-serif;

  --RS__modernTf:Athelas, Constantia, Charter, 'Bitstream Charter', Cambria, 'Georgia Pro', Georgia, serif;

  --RS__oldStyleTf:'Iowan Old Style', Sitka, 'Sitka Text', Palatino, 'Book Antiqua', 'URW Palladio L', P052, serif;

  --RS__zh-HK-lineHeightCompensation:1.167;

  --RS__zh-HK-baseFontFamily:'\u65B9\u9AD4', 'PingFang HK', '\u65B9\u9AD4', 'PingFang TC', '\u9ED1\u9AD4', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-TW-lineHeightCompensation:1.167;

  --RS__zh-TW-baseFontFamily:'\u65B9\u9AD4', 'PingFang TC', '\u9ED1\u9AD4', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-Hant-lineHeightCompensation:1.167;

  --RS__zh-Hant-baseFontFamily:'\u65B9\u9AD4', 'PingFang TC', '\u9ED1\u9AD4', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-lineHeightCompensation:1.167;

  --RS__zh-baseFontFamily:'\u65B9\u4F53', 'PingFang SC', '\u9ED1\u4F53', 'Heiti SC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK SC', sans-serif;

  --RS__th-lineHeightCompensation:1.067;

  --RS__th-baseFontFamily:Thonburi, 'Leelawadee UI', 'Cordia New', Roboto, Noto, 'Noto Sans Thai', sans-serif;

  --RS__te-baseFontFamily:'Kohinoor Telugu', 'Telugu Sangam MN', 'Nirmala UI', Gautami, Roboto, Noto, 'Noto Sans Telugu', sans-serif;

  --RS__ta-lineHeightCompensation:1.067;

  --RS__ta-baseFontFamily:'Tamil Sangam MN', 'Nirmala UI', Latha, Roboto, Noto, 'Noto Sans Tamil', sans-serif;

  --RS__si-lineHeightCompensation:1.167;

  --RS__si-baseFontFamily:'Sinhala Sangam MN', 'Nirmala UI', 'Iskoola Pota', Roboto, Noto, 'Noto Sans Sinhala', sans-serif;

  --RS__pa-lineHeightCompensation:1.1;

  --RS__pa-baseFontFamily:'Gurmukhi MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Gurmukhi', sans-serif;

  --RS__or-lineHeightCompensation:1.167;

  --RS__or-baseFontFamily:'Oriya Sangam MN', 'Nirmala UI', Kalinga, Roboto, Noto, 'Noto Sans Oriya', sans-serif;

  --RS__ml-lineHeightCompensation:1.067;

  --RS__ml-baseFontFamily:'Malayalam Sangam MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Malayalam', sans-serif;

  --RS__lo-baseFontFamily:'Lao Sangam MN', 'Leelawadee UI', 'Lao UI', Roboto, Noto, 'Noto Sans Lao', sans-serif;

  --RS__ko-lineHeightCompensation:1.167;

  --RS__ko-baseFontFamily:'Nanum Gothic', 'Apple SD Gothic Neo', 'Malgun Gothic', Roboto, Noto, 'Noto Sans CJK KR', sans-serif;

  --RS__kn-lineHeightCompensation:1.1;

  --RS__kn-baseFontFamily:'Kannada Sangam MN', 'Nirmala UI', Tunga, Roboto, Noto, 'Noto Sans Kannada', sans-serif;

  --RS__km-lineHeightCompensation:1.067;

  --RS__km-baseFontFamily:'Khmer Sangam MN', 'Leelawadee UI', 'Khmer UI', Roboto, Noto, 'Noto Sans Khmer', sans-serif;

  --RS__ja-lineHeightCompensation:1.167;

  --RS__ja-baseFontFamily:YuGothic, 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo UI', 'MS Gothic', Roboto, Noto, 'Noto Sans CJK JP', sans-serif;

  --RS__iu-baseFontFamily:'Euphemia UCAS', Euphemia, Roboto, Noto, 'Noto Sans Canadian Aboriginal', sans-serif;

  --RS__hy-baseFontFamily:Mshtakan, Sylfaen, Roboto, Noto, 'Noto Serif Armenian', serif;

  --RS__hi-lineHeightCompensation:1.1;

  --RS__hi-baseFontFamily:'Kohinoor Devanagari', 'Devanagari Sangam MN', Kokila, 'Nirmala UI', Roboto, Noto, 'Noto Sans Devanagari', sans-serif;

  --RS__he-lineHeightCompensation:1.1;

  --RS__he-baseFontFamily:'New Peninim MT', 'Arial Hebrew', Gisha, 'Times New Roman', Roboto, Noto, 'Noto Sans Hebrew', sans-serif;

  --RS__gu-lineHeightCompensation:1.167;

  --RS__gu-baseFontFamily:'Gujarati Sangam MN', 'Nirmala UI', Shruti, Roboto, Noto, 'Noto Sans Gujarati', sans-serif;

  --RS__fa-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__chr-lineHeightCompensation:1.167;

  --RS__chr-baseFontFamily:'Plantagenet Cherokee', Roboto, Noto, 'Noto Sans Cherokee';

  --RS__bo-baseFontFamily:Kailasa, 'Microsoft Himalaya', Roboto, Noto, 'Noto Sans Tibetan', sans-serif;

  --RS__bn-lineHeightCompensation:1.067;

  --RS__bn-baseFontFamily:'Kohinoor Bangla', 'Bangla Sangam MN', Vrinda, Roboto, Noto, 'Noto Sans Bengali', sans-serif;

  --RS__ar-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__am-lineHeightCompensation:1.167;

  --RS__am-baseFontFamily:Kefa, Nyala, Roboto, Noto, 'Noto Sans Ethiopic', serif;

  --RS__latin-lineHeightCompensation:1;

  --RS__latin-baseFontFamily:var(--RS__oldStyleTf);
  --RS__baseFontFamily:var(--RS__latin-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__latin-lineHeightCompensation);
  --RS__baseLineHeight:calc(1.5 * var(--RS__lineHeightCompensation));

  --RS__selectionTextColor:inherit;

  --RS__selectionBackgroundColor:#b4d8fe;

  --RS__visitedColor:#551A8B;

  --RS__linkColor:#0000EE;

  --RS__textColor:#121212;

  --RS__backgroundColor:#FFFFFF;
  color:var(--RS__textColor) !important;

  background-color:var(--RS__backgroundColor) !important;
}

::-moz-selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

::selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

html{
  font-family:var(--RS__baseFontFamily);
  line-height:1.6;
  line-height:var(--RS__baseLineHeight);
  text-rendering:optimizelegibility;
}

h1, h2, h3{
  line-height:normal;
}

:lang(ja),
:lang(zh),
:lang(ko){
  word-wrap:break-word;
  -webkit-line-break:strict;
  -epub-line-break:strict;
  line-break:strict;
}

math{
  font-family:"Latin Modern Math", "STIX Two Math", "XITS Math", "STIX Math", "Libertinus Math", "TeX Gyre Termes Math", "TeX Gyre Bonum Math", "TeX Gyre Schola", "DejaVu Math TeX Gyre", "TeX Gyre Pagella Math", "Asana Math", "Cambria Math", "Lucida Bright Math", "Minion Math", STIXGeneral, STIXSizeOneSym, Symbol, "Times New Roman", serif;
}

:lang(am){
  --RS__baseFontFamily:var(--RS__am-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__am-lineHeightCompensation);
}

:lang(ar){
  --RS__baseFontFamily:var(--RS__ar-baseFontFamily);
}

:lang(bn){
  --RS__baseFontFamily:var(--RS__bn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__bn-lineHeightCompensation);
}

:lang(bo){
  --RS__baseFontFamily:var(--RS__bo-baseFontFamily);
}

:lang(chr){
  --RS__baseFontFamily:var(--RS__chr-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__chr-lineHeightCompensation);
}

:lang(fa){
  --RS__baseFontFamily:var(--RS__fa-baseFontFamily);
}

:lang(gu){
  --RS__baseFontFamily:var(--RS__gu-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__gu-lineHeightCompensation);
}

:lang(he){
  --RS__baseFontFamily:var(--RS__he-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__he-lineHeightCompensation);
}

:lang(hi){
  --RS__baseFontFamily:var(--RS__hi-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__hi-lineHeightCompensation);
}

:lang(hy){
  --RS__baseFontFamily:var(--RS__hy-baseFontFamily);
}

:lang(iu){
  --RS__baseFontFamily:var(--RS__iu-baseFontFamily);
}

:lang(ja){
  --RS__baseFontFamily:var(--RS__ja-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ja-lineHeightCompensation);
}

:lang(km){
  --RS__baseFontFamily:var(--RS__km-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__km-lineHeightCompensation);
}

:lang(kn){
  --RS__baseFontFamily:var(--RS__kn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__kn-lineHeightCompensation);
}

:lang(ko){
  --RS__baseFontFamily:var(--RS__ko-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ko-lineHeightCompensation);
}

:lang(lo){
  --RS__baseFontFamily:var(--RS__lo-baseFontFamily);
}

:lang(ml){
  --RS__baseFontFamily:var(--RS__ml-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ml-lineHeightCompensation);
}

:lang(or){
  --RS__baseFontFamily:var(--RS__or-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__or-lineHeightCompensation);
}

:lang(pa){
  --RS__baseFontFamily:var(--RS__pa-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__pa-lineHeightCompensation);
}

:lang(si){
  --RS__baseFontFamily:var(--RS__si-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__si-lineHeightCompensation);
}

:lang(ta){
  --RS__baseFontFamily:var(--RS__ta-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ta-lineHeightCompensation);
}

:lang(te){
  --RS__baseFontFamily:var(--RS__te-baseFontFamily);
}

:lang(th){
  --RS__baseFontFamily:var(--RS__th-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__th-lineHeightCompensation);
}

:lang(zh){
  --RS__baseFontFamily:var(--RS__zh-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-lineHeightCompensation);
}

:lang(zh-Hant){
  --RS__baseFontFamily:var(--RS__zh-Hant-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-Hant-lineHeightCompensation);
}

:lang(zh-TW){
  --RS__baseFontFamily:var(--RS__zh-TW-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-TW-lineHeightCompensation);
}

:lang(zh-HK){
  --RS__baseFontFamily:var(--RS__zh-HK-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-HK-lineHeightCompensation);
}

body{
  widows:2;
  orphans:2;
}

figcaption, th, td{
  widows:1;
  orphans:1;
}

h2, h3, h4, h5, h6, dt,
hr, caption{
  -webkit-column-break-after:avoid;
  page-break-after:avoid;
  break-after:avoid;
}

h1, h2, h3, h4, h5, h6, dt,
figure, tr{
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

body{
  -webkit-hyphenate-character:"\\002D";
  -moz-hyphenate-character:"\\002D";
  -ms-hyphenate-character:"\\002D";
  hyphenate-character:"\\002D";
  -webkit-hyphenate-limit-lines:3;
  -ms-hyphenate-limit-lines:3;
  hyphenate-limit-lines:3;
}

h1, h2, h3, h4, h5, h6, dt,
figcaption, pre, caption, address,
center, code, var{
  -ms-hyphens:none;
  -moz-hyphens:none;
  -webkit-hyphens:none;
  -epub-hyphens:none;
  hyphens:none;
}

body{
  font-variant-numeric:oldstyle-nums proportional-nums;
}

:lang(ja) body,
:lang(zh) body,
:lang(ko) body{
  font-variant-numeric:lining-nums proportional-nums;
}

h1, h2, h3, h4, h5, h6, dt{
  font-variant-numeric:lining-nums proportional-nums;
}

table{
  font-variant-numeric:lining-nums tabular-nums;
}

code, var{
  font-variant-ligatures:none;
  font-variant-numeric:lining-nums tabular-nums slashed-zero;
}

rt{
  font-variant-east-asian:ruby;
}

:lang(ar){
  font-variant-ligatures:common-ligatures;
}

:lang(ko){
  font-kerning:normal;
}

hr{
  color:inherit;
  border-color:currentcolor;
}

table, th, td{
  border-color:currentcolor;
}

figure, blockquote{
  margin:1em 5%;
}

ul, ol{
  padding-left:5%;
}

dd{
  margin-left:5%;
}

pre{
  white-space:pre-wrap;
  -ms-tab-size:2;
  -moz-tab-size:2;
  -webkit-tab-size:2;
  tab-size:2;
}

abbr[title], acronym[title]{
  text-decoration:dotted underline;
}

nobr wbr{
  white-space:normal;
}

ruby > rt, ruby > rp{
  -webkit-user-select:none;
  -moz-user-select:none;
  -ms-user-select:none;
  user-select:none;
}

*:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)),
*:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)),
*:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)),
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) cite, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) dfn, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) em, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) i,
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) cite, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) dfn, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) em, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) i,
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) cite, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) dfn, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) em, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) i{
  font-style:normal;
}

:lang(ja) a,
:lang(zh) a,
:lang(ko) a{
  text-decoration:none;
}

:root{
  --RS__maxMediaWidth:100%;
  --RS__maxMediaHeight:95vh;
  --RS__boxSizingMedia:border-box;
  --RS__boxSizingTable:border-box;
}

a, a span, span a, h1, h2, h3, h4, h5, h6{
  word-wrap:break-word;
}

div{
  max-width:var(--RS__maxMediaWidth);
}

img, svg|svg, video{
  object-fit:contain;

  width:auto;
  height:auto;
  max-width:var(--RS__maxMediaWidth);
  max-height:var(--RS__maxMediaHeight) !important;
  box-sizing:var(--RS__boxSizingMedia);
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

@supports (zoom: 1) and (not ((-webkit-column-axis: horizontal) and (-webkit-column-progression: normal))){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] img,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] svg|svg,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] video{
    zoom:calc(100% / var(--USER__fontSize));
  }
}

audio{
    max-width:100%;
    -webkit-column-break-inside:avoid;
    page-break-inside:avoid;
    break-inside:avoid;
  }

table{
  max-width:var(--RS__maxMediaWidth);
  box-sizing:var(--RS__boxSizingTable);
}`});var dl={};vt(dl,{default:()=>vd});var vd,ul=gt(()=>{p();vd=`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017\u20132026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickae\u0308l Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{

  --RS__compFontFamily:var(--RS__baseFontFamily);
  --RS__codeFontFamily:var(--RS__monospaceTf);

  --RS__typeScale:1.125;
  --RS__baseFontSize:87.5%;

  --RS__flowSpacing:1.5rem;
  --RS__paraSpacing:0;
  --RS__paraIndent:1em;

  --RS__linkColor:#0000EE;
  --RS__visitedColor:#551A8B;

  --RS__primaryColor:;
  --RS__secondaryColor:;
}

:root:lang(zh){
  --RS__paraIndent:2em;
}

:root{
  quotes:"\\201c" "\\201d" "\\2018" "\\2019";
}

body{
  font-size:var(--RS__baseFontSize);
  text-align:justify;
  text-justify:inter-character;
}

h1, h2, h3, h4, h5, h6{
  font-family:var(--RS__baseFontFamily);
  text-align:left;
  text-align:start;
}

blockquote, figure, p, pre,
aside, footer, form, hr{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
}

p{
  margin-top:var(--RS__paraSpacing);
  margin-bottom:var(--RS__paraSpacing);
  text-indent:var(--RS__paraIndent);
}

pre{
  font-family:var(--RS__codeFontFamily);
}

code, kbd, samp, tt{
  font-family:var(--RS__codeFontFamily);
}

sub, sup{
  position:relative;
  font-size:67.5%;
  line-height:1;
}

sub{
  bottom:-0.2ex;
}

sup{
  bottom:0;
}

em{
  -webkit-text-emphasis:dot;
  -epub-text-emphasis:dot;
  text-emphasis:dot;
}

:link{
  color:var(--RS__linkColor);
}

:visited{
  color:var(--RS__visitedColor);
}

h1{
  margin-top:calc(var(--RS__flowSpacing) * 2);
  margin-bottom:calc(var(--RS__flowSpacing) * 2);
  font-size:calc(((1em * var(--RS__typeScale)) * var(--RS__typeScale)) * var(--RS__typeScale));
  text-align:center;
}

h2{
  margin-top:calc(var(--RS__flowSpacing) * 2);
  margin-bottom:var(--RS__flowSpacing);
  font-size:calc((1em * var(--RS__typeScale)) * var(--RS__typeScale));
  text-align:center;
}

h3{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:calc(1em * var(--RS__typeScale));
  text-align:center;
}

h4{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-family:var(--RS__compFontFamily);
  font-size:1em;
}

h5{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-family:var(--RS__compFontFamily);
  font-size:smaller;
}

h6{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:0;
  font-family:var(--RS__compFontFamily);
  font-size:smaller;
  font-weight:normal;
}

dl, ol, ul{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
}

table{
  margin:var(--RS__flowSpacing) 0;
  border:1px solid currentcolor;
  border-collapse:collapse;
  empty-cells:show;
}

thead, tbody, tfoot, table > tr{
  vertical-align:top;
}

th{
  text-align:left;
}

th, td{
  padding:4px;
  border:1px solid currentcolor;
}`});var ml={};vt(ml,{default:()=>wd});var wd,pl=gt(()=>{p();wd=`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017\u20132026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickae\u0308l Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{

  --RS__viewportWidth:100%;

  --RS__pageGutter:0;

  --RS__defaultLineLength:100%;

  --RS__colGap:0;

  --RS__colCount:1;

  --RS__colWidth:100vw;
}

@page{
  margin:0 !important;
}

:root{
  position:relative;

  -webkit-column-width:var(--RS__colWidth);
  -moz-column-width:var(--RS__colWidth);
  column-width:var(--RS__colWidth);
  -webkit-column-count:var(--RS__colCount);
  -moz-column-count:var(--RS__colCount);
  column-count:var(--RS__colCount);

  -webkit-column-gap:var(--RS__colGap);
  -moz-column-gap:var(--RS__colGap);
  column-gap:var(--RS__colGap);
  -moz-column-fill:auto;
  column-fill:auto;
  width:var(--RS__viewportWidth);
  height:100vh;
  max-width:var(--RS__viewportWidth);
  max-height:100vh;
  min-width:var(--RS__viewportWidth);
  min-height:100vh;
  padding:0 !important;
  margin:0 !important;
  font-size:1rem !important;
  box-sizing:border-box;
  -webkit-touch-callout:none;
}

body{
  width:100%;
  max-width:var(--RS__defaultLineLength) !important;
  margin:0 auto !important;
  box-sizing:border-box;
}

:root:not([style*="readium-scroll-on"]) body{
  padding:0 var(--RS__pageGutter) !important;
}

:root:not([style*="readium-noOverflow-on"]) body{
  overflow:hidden;
}

@supports (overflow: clip){

   :root:not([style*="readium-noOverflow-on"]){
      overflow:clip;
   }

   :root:not([style*="readium-noOverflow-on"]) body{
      overflow:clip;
      overflow-clip-margin:content-box;
   }
}

:root[style*="readium-scroll-on"]{
  -webkit-columns:auto auto !important;
  -moz-columns:auto auto !important;
  columns:auto auto !important;
  width:auto !important;
  height:auto !important;
  max-width:none !important;
  max-height:none !important;
  min-width:0 !important;
  min-height:0 !important;
}

:root[style*="readium-scroll-on"] body{
  max-width:var(--RS__defaultLineLength) !important;
  box-sizing:border-box !important;
}

:root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
  overflow:auto;
}

@supports (overflow: clip){

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]){
     overflow:auto;
  }

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
     overflow:clip;
  }
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingTop"] body{
  padding-top:var(--RS__scrollPaddingTop) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingBottom"] body{
  padding-bottom:var(--RS__scrollPaddingBottom) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingLeft"] body{
  padding-left:var(--RS__scrollPaddingLeft) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingRight"] body{
  padding-right:var(--RS__scrollPaddingRight) !important;
}

:root[style*="--USER__backgroundColor"]{
  background-color:var(--USER__backgroundColor) !important;
}

:root[style*="--USER__backgroundColor"] *{
  background-color:transparent !important;
}

:root[style*="--USER__textColor"]{
  color:var(--USER__textColor) !important;
}

:root[style*="--USER__textColor"] *:not(a){
  color:inherit !important;
  background-color:transparent !important;
  border-color:currentcolor !important;
}

:root[style*="--USER__textColor"] svg text{
  fill:currentcolor !important;
  stroke:none !important;
}

:root[style*="--USER__linkColor"] a:link,
:root[style*="--USER__linkColor"] a:link *{
  color:var(--USER__linkColor) !important;
}

:root[style*="--USER__visitedColor"] a:visited,
:root[style*="--USER__visitedColor"] a:visited *{
  color:var(--USER__visitedColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::-moz-selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__colCount"]{
  -webkit-column-count:var(--USER__colCount);
  -moz-column-count:var(--USER__colCount);
  column-count:var(--USER__colCount);

  --RS__colWidth:auto;
}

:root[style*="--USER__colCount: 0"],
:root[style*="--USER__colCount:0"]{
  -webkit-column-count:1;
  -moz-column-count:1;
  column-count:1;
}

:root[style*="--USER__colCount: 0"],
:root[style*="--USER__colCount:0"],
:root[style*="--USER__colCount: 1"],
:root[style*="--USER__colCount:1"]{
  --RS__colWidth:100vw;
}

:root[style*="--USER__lineLength"] body{
    max-width:var(--USER__lineLength) !important;
  }

:root[style*="--USER__fontFamily"]{
  font-family:var(--USER__fontFamily) !important;
}

:root[style*="--USER__fontFamily"] *{
  font-family:revert !important;
}

:root:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] body{
  zoom:var(--USER__fontSize) !important;
}

:root:not([style*="readium-deprecatedFontSize-on"])[style*="readium-iOSPatch-on"][style*="--USER__fontSize"] body{
  -webkit-text-size-adjust:var(--USER__fontSize) !important;
}

@supports selector(figure:has(> img)){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> img),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> video),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> svg),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> canvas),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> iframe),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> audio),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> img:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> video:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> svg:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> canvas:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> iframe:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> audio:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] table{
    zoom:calc(100% / var(--USER__fontSize)) !important;
  }

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figcaption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] caption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] td,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] th{
    zoom:var(--USER__fontSize) !important;
  }
}

@supports not (zoom: 1){

  :root[style*="--USER__fontSize"]{
    font-size:var(--USER__fontSize) !important;
  }
}

:root[style*="readium-deprecatedFontSize-on"][style*="--USER__fontSize"]{
  font-size:var(--USER__fontSize) !important;
}

:root[style*="--USER__lineHeight"]{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__lineHeight"] body,
:root[style*="--USER__lineHeight"] p,
:root[style*="--USER__lineHeight"] li,
:root[style*="--USER__lineHeight"] div{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__paraSpacing"] p{
  margin-top:var(--USER__paraSpacing) !important;
  margin-bottom:var(--USER__paraSpacing) !important;
}

:root[style*="--USER__fontWeight"] body{
  font-weight:var(--USER__fontWeight) !important;
}

:root[style*="--USER__fontWeight"] b,
:root[style*="--USER__fontWeight"] strong{
  font-weight:bolder;
}

:root[style*="--USER__fontWidth"] body{
  font-stretch:var(--USER__fontWidth) !important;
}

:root[style*="--USER__fontOpticalSizing"] body{
  font-optical-sizing:var(--USER__fontOpticalSizing) !important;
}

:root[style*="--USER__letterSpacing"] h1,
:root[style*="--USER__letterSpacing"] h2,
:root[style*="--USER__letterSpacing"] h3,
:root[style*="--USER__letterSpacing"] h4,
:root[style*="--USER__letterSpacing"] h5,
:root[style*="--USER__letterSpacing"] h6,
:root[style*="--USER__letterSpacing"] p,
:root[style*="--USER__letterSpacing"] li,
:root[style*="--USER__letterSpacing"] div,
:root[style*="--USER__letterSpacing"] dt,
:root[style*="--USER__letterSpacing"] dd{
  letter-spacing:var(--USER__letterSpacing) !important;
  font-variant:none !important;
}

:root[style*="readium-noRuby-on"] body rt,
:root[style*="readium-noRuby-on"] body rp{
  display:none;
}

:root[style*="readium-blend-on"] svg,
:root[style*="readium-blend-on"] img{
  background-color:transparent !important;
  mix-blend-mode:multiply !important;
}

:root[style*="--USER__darkenImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) !important;
  filter:brightness(var(--USER__darkenImages)) !important;
}

:root[style*="readium-darken-on"] img{
  -webkit-filter:brightness(80%) !important;
  filter:brightness(80%) !important;
}

:root[style*="--USER__invertImages"] img{
  -webkit-filter:invert(var(--USER__invertImages)) !important;
  filter:invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-invert-on"] img{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="--USER__darkenImages"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
  filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-darken-on"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(80%) invert(var(--USER__invertImages)) !important;
  filter:brightness(80%) invert(var(--USER__invertImages)) !important;
}

:root[style*="--USER__darkenImages"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
  filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
}

:root[style*="readium-darken-on"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(80%) invert(100%) !important;
  filter:brightness(80%) invert(100%) !important;
}

:root[style*="--USER__invertGaiji"] img[class*="gaiji"]{
  -webkit-filter:invert(var(--USER__invertGaiji)) !important;
  filter:invert(var(--USER__invertGaiji)) !important;
}

:root[style*="readium-invertGaiji-on"] img[class*="gaiji"]{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="readium-normalize-on"]{
  --USER__typeScale:1.2;
}

:root[style*="readium-normalize-on"] p,
:root[style*="readium-normalize-on"] li,
:root[style*="readium-normalize-on"] div,
:root[style*="readium-normalize-on"] pre,
:root[style*="readium-normalize-on"] dd{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] h1{
  font-size:1.75rem !important;
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h2{
  font-size:1.5rem !important;
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h3{
  font-size:1.25rem !important;
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h4,
:root[style*="readium-normalize-on"] h5,
:root[style*="readium-normalize-on"] h6{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] small{
  font-size:smaller !important;
}

:root[style*="readium-normalize-on"] sub,
:root[style*="readium-normalize-on"] sup{
  font-size:67.5% !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h1{
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h2{
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h3{
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-iPadOSPatch-on"] body{
  -webkit-text-size-adjust:none;
}

:root[style*="readium-iPadOSPatch-on"] p, 
:root[style*="readium-iPadOSPatch-on"] h1, 
:root[style*="readium-iPadOSPatch-on"] h2, 
:root[style*="readium-iPadOSPatch-on"] h3, 
:root[style*="readium-iPadOSPatch-on"] h4, 
:root[style*="readium-iPadOSPatch-on"] h5, 
:root[style*="readium-iPadOSPatch-on"] h6, 
:root[style*="readium-iPadOSPatch-on"] li, 
:root[style*="readium-iPadOSPatch-on"] th, 
:root[style*="readium-iPadOSPatch-on"] td, 
:root[style*="readium-iPadOSPatch-on"] dt, 
:root[style*="readium-iPadOSPatch-on"] dd, 
:root[style*="readium-iPadOSPatch-on"] pre, 
:root[style*="readium-iPadOSPatch-on"] address, 
:root[style*="readium-iPadOSPatch-on"] details, 
:root[style*="readium-iPadOSPatch-on"] summary,
:root[style*="readium-iPadOSPatch-on"] figcaption,
:root[style*="readium-iPadOSPatch-on"] div:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)),
:root[style*="readium-iPadOSPatch-on"] aside:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)){
  -webkit-text-zoom:reset;
}

:root[style*="readium-iPadOSPatch-on"] abbr, 
:root[style*="readium-iPadOSPatch-on"] b, 
:root[style*="readium-iPadOSPatch-on"] bdi, 
:root[style*="readium-iPadOSPatch-on"] bdo, 
:root[style*="readium-iPadOSPatch-on"] cite, 
:root[style*="readium-iPadOSPatch-on"] code, 
:root[style*="readium-iPadOSPatch-on"] dfn, 
:root[style*="readium-iPadOSPatch-on"] em, 
:root[style*="readium-iPadOSPatch-on"] i, 
:root[style*="readium-iPadOSPatch-on"] kbd, 
:root[style*="readium-iPadOSPatch-on"] mark, 
:root[style*="readium-iPadOSPatch-on"] q, 
:root[style*="readium-iPadOSPatch-on"] rp, 
:root[style*="readium-iPadOSPatch-on"] rt, 
:root[style*="readium-iPadOSPatch-on"] ruby, 
:root[style*="readium-iPadOSPatch-on"] s, 
:root[style*="readium-iPadOSPatch-on"] samp, 
:root[style*="readium-iPadOSPatch-on"] small, 
:root[style*="readium-iPadOSPatch-on"] span, 
:root[style*="readium-iPadOSPatch-on"] strong, 
:root[style*="readium-iPadOSPatch-on"] sub, 
:root[style*="readium-iPadOSPatch-on"] sup, 
:root[style*="readium-iPadOSPatch-on"] time, 
:root[style*="readium-iPadOSPatch-on"] u, 
:root[style*="readium-iPadOSPatch-on"] var{
  -webkit-text-zoom:normal;
}

:root[style*="readium-iPadOSPatch-on"] p:not(:has(b, cite, em, i, q, s, small, span, strong)):first-line{
  -webkit-text-zoom:normal;
}`});var gl={};vt(gl,{default:()=>Rd});var Rd,fl=gt(()=>{p();Rd=`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017\u20132026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickae\u0308l Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

@-ms-viewport{
  width:device-width;
}

@viewport{
  width:device-width;
  zoom:1;
}

:root{

  --RS__sans-serif-ja-v:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', '\u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDGothic', 'Yu Gothic', '\uFF2D\uFF33\u30B4\u30B7\u30C3\u30AF', 'MS Gothic', sans-serif;

  --RS__serif-ja-v:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDMincho', 'Yu Mincho', '\uFF2D\uFF33\u660E\u671D', 'MS Mincho', serif;

  --RS__sans-serif-ja:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', '\u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDPGothic', 'Yu Gothic', '\uFF2D\uFF33 \uFF30\u30B4\u30B7\u30C3\u30AF', 'MS PGothic', sans-serif;

  --RS__serif-ja:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDPMincho', 'Yu Mincho', '\uFF2D\uFF33 \uFF30\u660E\u671D', 'MS PMincho', serif;

  --RS__monospaceTf:ui-monospace, 'Andale Mono', 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;

  --RS__humanistTf:Seravek, Calibri, 'Gill Sans Nova', Roboto, Ubuntu, 'DejaVu Sans', source-sans-pro, sans-serif;

  --RS__sansTf:-ui-sans-serif, -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Liberation Sans', Arial, sans-serif;

  --RS__modernTf:Athelas, Constantia, Charter, 'Bitstream Charter', Cambria, 'Georgia Pro', Georgia, serif;

  --RS__oldStyleTf:'Iowan Old Style', Sitka, 'Sitka Text', Palatino, 'Book Antiqua', 'URW Palladio L', P052, serif;

  --RS__zh-HK-lineHeightCompensation:1.167;

  --RS__zh-HK-baseFontFamily:'\u65B9\u9AD4', 'PingFang HK', '\u65B9\u9AD4', 'PingFang TC', '\u9ED1\u9AD4', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-TW-lineHeightCompensation:1.167;

  --RS__zh-TW-baseFontFamily:'\u65B9\u9AD4', 'PingFang TC', '\u9ED1\u9AD4', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-Hant-lineHeightCompensation:1.167;

  --RS__zh-Hant-baseFontFamily:'\u65B9\u9AD4', 'PingFang TC', '\u9ED1\u9AD4', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-lineHeightCompensation:1.167;

  --RS__zh-baseFontFamily:'\u65B9\u4F53', 'PingFang SC', '\u9ED1\u4F53', 'Heiti SC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK SC', sans-serif;

  --RS__th-lineHeightCompensation:1.067;

  --RS__th-baseFontFamily:Thonburi, 'Leelawadee UI', 'Cordia New', Roboto, Noto, 'Noto Sans Thai', sans-serif;

  --RS__te-baseFontFamily:'Kohinoor Telugu', 'Telugu Sangam MN', 'Nirmala UI', Gautami, Roboto, Noto, 'Noto Sans Telugu', sans-serif;

  --RS__ta-lineHeightCompensation:1.067;

  --RS__ta-baseFontFamily:'Tamil Sangam MN', 'Nirmala UI', Latha, Roboto, Noto, 'Noto Sans Tamil', sans-serif;

  --RS__si-lineHeightCompensation:1.167;

  --RS__si-baseFontFamily:'Sinhala Sangam MN', 'Nirmala UI', 'Iskoola Pota', Roboto, Noto, 'Noto Sans Sinhala', sans-serif;

  --RS__pa-lineHeightCompensation:1.1;

  --RS__pa-baseFontFamily:'Gurmukhi MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Gurmukhi', sans-serif;

  --RS__or-lineHeightCompensation:1.167;

  --RS__or-baseFontFamily:'Oriya Sangam MN', 'Nirmala UI', Kalinga, Roboto, Noto, 'Noto Sans Oriya', sans-serif;

  --RS__ml-lineHeightCompensation:1.067;

  --RS__ml-baseFontFamily:'Malayalam Sangam MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Malayalam', sans-serif;

  --RS__lo-baseFontFamily:'Lao Sangam MN', 'Leelawadee UI', 'Lao UI', Roboto, Noto, 'Noto Sans Lao', sans-serif;

  --RS__ko-lineHeightCompensation:1.167;

  --RS__ko-baseFontFamily:'Nanum Gothic', 'Apple SD Gothic Neo', 'Malgun Gothic', Roboto, Noto, 'Noto Sans CJK KR', sans-serif;

  --RS__kn-lineHeightCompensation:1.1;

  --RS__kn-baseFontFamily:'Kannada Sangam MN', 'Nirmala UI', Tunga, Roboto, Noto, 'Noto Sans Kannada', sans-serif;

  --RS__km-lineHeightCompensation:1.067;

  --RS__km-baseFontFamily:'Khmer Sangam MN', 'Leelawadee UI', 'Khmer UI', Roboto, Noto, 'Noto Sans Khmer', sans-serif;

  --RS__ja-lineHeightCompensation:1.167;

  --RS__ja-baseFontFamily:YuGothic, 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo UI', 'MS Gothic', Roboto, Noto, 'Noto Sans CJK JP', sans-serif;

  --RS__iu-baseFontFamily:'Euphemia UCAS', Euphemia, Roboto, Noto, 'Noto Sans Canadian Aboriginal', sans-serif;

  --RS__hy-baseFontFamily:Mshtakan, Sylfaen, Roboto, Noto, 'Noto Serif Armenian', serif;

  --RS__hi-lineHeightCompensation:1.1;

  --RS__hi-baseFontFamily:'Kohinoor Devanagari', 'Devanagari Sangam MN', Kokila, 'Nirmala UI', Roboto, Noto, 'Noto Sans Devanagari', sans-serif;

  --RS__he-lineHeightCompensation:1.1;

  --RS__he-baseFontFamily:'New Peninim MT', 'Arial Hebrew', Gisha, 'Times New Roman', Roboto, Noto, 'Noto Sans Hebrew', sans-serif;

  --RS__gu-lineHeightCompensation:1.167;

  --RS__gu-baseFontFamily:'Gujarati Sangam MN', 'Nirmala UI', Shruti, Roboto, Noto, 'Noto Sans Gujarati', sans-serif;

  --RS__fa-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__chr-lineHeightCompensation:1.167;

  --RS__chr-baseFontFamily:'Plantagenet Cherokee', Roboto, Noto, 'Noto Sans Cherokee';

  --RS__bo-baseFontFamily:Kailasa, 'Microsoft Himalaya', Roboto, Noto, 'Noto Sans Tibetan', sans-serif;

  --RS__bn-lineHeightCompensation:1.067;

  --RS__bn-baseFontFamily:'Kohinoor Bangla', 'Bangla Sangam MN', Vrinda, Roboto, Noto, 'Noto Sans Bengali', sans-serif;

  --RS__ar-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__am-lineHeightCompensation:1.167;

  --RS__am-baseFontFamily:Kefa, Nyala, Roboto, Noto, 'Noto Sans Ethiopic', serif;

  --RS__latin-lineHeightCompensation:1;

  --RS__latin-baseFontFamily:var(--RS__oldStyleTf);
  --RS__baseFontFamily:var(--RS__latin-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__latin-lineHeightCompensation);
  --RS__baseLineHeight:calc(1.5 * var(--RS__lineHeightCompensation));

  --RS__selectionTextColor:inherit;

  --RS__selectionBackgroundColor:#b4d8fe;

  --RS__visitedColor:#551A8B;

  --RS__linkColor:#0000EE;

  --RS__textColor:#121212;

  --RS__backgroundColor:#FFFFFF;
  color:var(--RS__textColor) !important;

  background-color:var(--RS__backgroundColor) !important;
}

::-moz-selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

::selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

html{
  font-family:var(--RS__baseFontFamily);
  line-height:1.6;
  line-height:var(--RS__baseLineHeight);
  text-rendering:optimizelegibility;
}

h1, h2, h3{
  line-height:normal;
}

:lang(ja),
:lang(zh),
:lang(ko){
  word-wrap:break-word;
  -webkit-line-break:strict;
  -epub-line-break:strict;
  line-break:strict;
}

math{
  font-family:"Latin Modern Math", "STIX Two Math", "XITS Math", "STIX Math", "Libertinus Math", "TeX Gyre Termes Math", "TeX Gyre Bonum Math", "TeX Gyre Schola", "DejaVu Math TeX Gyre", "TeX Gyre Pagella Math", "Asana Math", "Cambria Math", "Lucida Bright Math", "Minion Math", STIXGeneral, STIXSizeOneSym, Symbol, "Times New Roman", serif;
}

:lang(am){
  --RS__baseFontFamily:var(--RS__am-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__am-lineHeightCompensation);
}

:lang(ar){
  --RS__baseFontFamily:var(--RS__ar-baseFontFamily);
}

:lang(bn){
  --RS__baseFontFamily:var(--RS__bn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__bn-lineHeightCompensation);
}

:lang(bo){
  --RS__baseFontFamily:var(--RS__bo-baseFontFamily);
}

:lang(chr){
  --RS__baseFontFamily:var(--RS__chr-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__chr-lineHeightCompensation);
}

:lang(fa){
  --RS__baseFontFamily:var(--RS__fa-baseFontFamily);
}

:lang(gu){
  --RS__baseFontFamily:var(--RS__gu-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__gu-lineHeightCompensation);
}

:lang(he){
  --RS__baseFontFamily:var(--RS__he-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__he-lineHeightCompensation);
}

:lang(hi){
  --RS__baseFontFamily:var(--RS__hi-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__hi-lineHeightCompensation);
}

:lang(hy){
  --RS__baseFontFamily:var(--RS__hy-baseFontFamily);
}

:lang(iu){
  --RS__baseFontFamily:var(--RS__iu-baseFontFamily);
}

:lang(ja){
  --RS__baseFontFamily:var(--RS__ja-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ja-lineHeightCompensation);
}

:lang(km){
  --RS__baseFontFamily:var(--RS__km-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__km-lineHeightCompensation);
}

:lang(kn){
  --RS__baseFontFamily:var(--RS__kn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__kn-lineHeightCompensation);
}

:lang(ko){
  --RS__baseFontFamily:var(--RS__ko-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ko-lineHeightCompensation);
}

:lang(lo){
  --RS__baseFontFamily:var(--RS__lo-baseFontFamily);
}

:lang(ml){
  --RS__baseFontFamily:var(--RS__ml-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ml-lineHeightCompensation);
}

:lang(or){
  --RS__baseFontFamily:var(--RS__or-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__or-lineHeightCompensation);
}

:lang(pa){
  --RS__baseFontFamily:var(--RS__pa-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__pa-lineHeightCompensation);
}

:lang(si){
  --RS__baseFontFamily:var(--RS__si-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__si-lineHeightCompensation);
}

:lang(ta){
  --RS__baseFontFamily:var(--RS__ta-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ta-lineHeightCompensation);
}

:lang(te){
  --RS__baseFontFamily:var(--RS__te-baseFontFamily);
}

:lang(th){
  --RS__baseFontFamily:var(--RS__th-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__th-lineHeightCompensation);
}

:lang(zh){
  --RS__baseFontFamily:var(--RS__zh-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-lineHeightCompensation);
}

:lang(zh-Hant){
  --RS__baseFontFamily:var(--RS__zh-Hant-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-Hant-lineHeightCompensation);
}

:lang(zh-TW){
  --RS__baseFontFamily:var(--RS__zh-TW-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-TW-lineHeightCompensation);
}

:lang(zh-HK){
  --RS__baseFontFamily:var(--RS__zh-HK-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-HK-lineHeightCompensation);
}

body{
  widows:2;
  orphans:2;
}

figcaption, th, td{
  widows:1;
  orphans:1;
}

h2, h3, h4, h5, h6, dt,
hr, caption{
  -webkit-column-break-after:avoid;
  page-break-after:avoid;
  break-after:avoid;
}

h1, h2, h3, h4, h5, h6, dt,
figure, tr{
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

body{
  -webkit-hyphenate-character:"\\002D";
  -moz-hyphenate-character:"\\002D";
  -ms-hyphenate-character:"\\002D";
  hyphenate-character:"\\002D";
  -webkit-hyphenate-limit-lines:3;
  -ms-hyphenate-limit-lines:3;
  hyphenate-limit-lines:3;
}

h1, h2, h3, h4, h5, h6, dt,
figcaption, pre, caption, address,
center, code, var{
  -ms-hyphens:none;
  -moz-hyphens:none;
  -webkit-hyphens:none;
  -epub-hyphens:none;
  hyphens:none;
}

body{
  font-variant-numeric:oldstyle-nums proportional-nums;
}

:lang(ja) body,
:lang(zh) body,
:lang(ko) body{
  font-variant-numeric:lining-nums proportional-nums;
}

h1, h2, h3, h4, h5, h6, dt{
  font-variant-numeric:lining-nums proportional-nums;
}

table{
  font-variant-numeric:lining-nums tabular-nums;
}

code, var{
  font-variant-ligatures:none;
  font-variant-numeric:lining-nums tabular-nums slashed-zero;
}

rt{
  font-variant-east-asian:ruby;
}

:lang(ar){
  font-variant-ligatures:common-ligatures;
}

:lang(ko){
  font-kerning:normal;
}

hr{
  color:inherit;
  border-color:currentcolor;
}

table, th, td{
  border-color:currentcolor;
}

figure, blockquote{
  margin:1em 5%;
}

ul, ol{
  padding-left:5%;
}

dd{
  margin-left:5%;
}

pre{
  white-space:pre-wrap;
  -ms-tab-size:2;
  -moz-tab-size:2;
  -webkit-tab-size:2;
  tab-size:2;
}

abbr[title], acronym[title]{
  text-decoration:dotted underline;
}

nobr wbr{
  white-space:normal;
}

ruby > rt, ruby > rp{
  -webkit-user-select:none;
  -moz-user-select:none;
  -ms-user-select:none;
  user-select:none;
}

*:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)),
*:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)),
*:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)),
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) cite, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) dfn, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) em, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) i,
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) cite, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) dfn, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) em, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) i,
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) cite, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) dfn, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) em, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) i{
  font-style:normal;
}

:lang(ja) a,
:lang(zh) a,
:lang(ko) a{
  text-decoration:none;
}

:root{
  --RS__maxMediaWidth:100%;
  --RS__maxMediaHeight:100vw;
  --RS__boxSizingMedia:border-box;
  --RS__boxSizingTable:border-box;
}

a, a span, span a, h1, h2, h3, h4, h5, h6{
  word-wrap:break-word;
}

div{
  max-width:var(--RS__maxMediaHeight);
}

img, svg|svg, video{
  object-fit:contain;

  width:auto;
  height:auto;
  max-width:var(--RS__maxMediaHeight);
  max-height:var(--RS__maxMediaWidth) !important;
  box-sizing:var(--RS__boxSizingMedia);
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

@supports (zoom: 1) and (not ((-webkit-column-axis: horizontal) and (-webkit-column-progression: normal))){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] img,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] svg|svg,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] video,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div{
    zoom:calc(100% / var(--USER__fontSize));
  }
}

audio{
  max-width:100%;
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

table{
  max-height:var(--RS__maxMediaWidth);
  box-sizing:var(--RS__boxSizingTable);
}`});var Sl={};vt(Sl,{default:()=>Cd});var Cd,yl=gt(()=>{p();Cd=`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017\u20132026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickae\u0308l Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{

  --RS__compFontFamily:var(--RS__baseFontFamily);
  --RS__codeFontFamily:var(--RS__monospaceTf);

  --RS__typeScale:1.125;
  --RS__baseFontSize:87.5%;

  --RS__flowSpacing:1.5rem;
  --RS__paraSpacing:0;
  --RS__paraIndent:1em;

  --RS__linkColor:#0000EE;
  --RS__visitedColor:#551A8B;

  --RS__primaryColor:;
  --RS__secondaryColor:;
}

:root:lang(zh){
  --RS__paraIndent:2em;
}

:lang("mn-Mong"){
  --RS__baseFontSize:100%;
}

body{
  font-size:var(--RS__baseFontSize);
  text-align:justify;
  text-justify:inter-character;
}

h1, h2, h3, h4, h5, h6{
  font-family:var(--RS__baseFontFamily);
  text-align:left;
  text-align:start;
}

blockquote, figure, p, pre,
aside, footer, form, hr{
  margin-right:var(--RS__flowSpacing);
  margin-left:var(--RS__flowSpacing);
}

p{
  margin-right:var(--RS__paraSpacing);
  margin-left:var(--RS__paraSpacing);
  text-indent:var(--RS__paraIndent);
}

pre{
  font-family:var(--RS__codeFontFamily);
}

code, kbd, samp, tt{
  font-family:var(--RS__codeFontFamily);
}

sub, sup{
  position:relative;
  font-size:67.5%;
  line-height:1;
}

sub{
  left:-0.2ex;
}

sup{
  right:0;
}

em{
  -webkit-text-emphasis:sesame;
  -epub-text-emphasis:sesame;
  text-emphasis:sesame;
}

:link{
  color:var(--RS__linkColor);
}

:visited{
  color:var(--RS__visitedColor);
}

h1{
  margin-right:calc(var(--RS__flowSpacing) * 2);
  margin-left:calc(var(--RS__flowSpacing) * 2);
  font-size:calc(((1em * var(--RS__typeScale)) * var(--RS__typeScale)) * var(--RS__typeScale));
  text-indent:2rem;
}

h2{
  margin-right:calc(var(--RS__flowSpacing) * 2);
  margin-left:var(--RS__flowSpacing);
  font-size:calc((1em * var(--RS__typeScale)) * var(--RS__typeScale));
  text-indent:3rem;
}

h3{
  margin-right:var(--RS__flowSpacing);
  margin-left:var(--RS__flowSpacing);
  font-size:calc(1em * var(--RS__typeScale));
  text-indent:4rem;
}

h4{
  margin-right:var(--RS__flowSpacing);
  margin-left:var(--RS__flowSpacing);
  font-family:var(--RS__compFontFamily);
  font-size:1em;
  text-indent:4rem;
}

h5{
  margin-right:var(--RS__flowSpacing);
  margin-left:var(--RS__flowSpacing);
  font-family:var(--RS__compFontFamily);
  font-size:smaller;
  text-indent:4rem;
}

h6{
  margin-right:var(--RS__flowSpacing);
  margin-left:0;
  font-family:var(--RS__compFontFamily);
  font-size:smaller;
  font-weight:normal;
  text-indent:4rem;
}

dl, ol, ul{
  margin-right:var(--RS__flowSpacing);
  margin-left:var(--RS__flowSpacing);
}

table{
  margin:0 var(--RS__flowSpacing);
  border:1px solid currentcolor;
  border-collapse:collapse;
  empty-cells:show;
}

thead, tbody, tfoot, table > tr{
  vertical-align:top;
}

th{
  text-align:left;
}

th, td{
  padding:4px;
  border:1px solid currentcolor;
}`});var _l={};vt(_l,{default:()=>Ed});var Ed,bl=gt(()=>{p();Ed=`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017\u20132026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickae\u0308l Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{

   --RS__viewportWidth:100%;

   --RS__pageGutter:0;

   --RS__defaultLineLength:100%;

   --RS__colGap:0;

   --RS__colCount:1;

   --RS__colWidth:100vw;
}

@page{
  margin:0 !important;
}

:root{
  position:relative;

  -webkit-column-width:var(--RS__colWidth);
  -moz-column-width:var(--RS__colWidth);
  column-width:var(--RS__colWidth);
  -webkit-column-count:var(--RS__colCount);
  -moz-column-count:var(--RS__colCount);
  column-count:var(--RS__colCount);

  -webkit-column-gap:var(--RS__colGap);
  -moz-column-gap:var(--RS__colGap);
  column-gap:var(--RS__colGap);
  -moz-column-fill:auto;
  column-fill:auto;
  width:100%;
  height:100vh;
  max-width:100%;
  max-height:100vh;
  min-width:100%;
  min-height:100vh;
  padding:0 !important;
  margin:0 !important;
  font-size:1rem !important;
  box-sizing:border-box;

  hanging-punctuation:last allow-end;
  -webkit-touch-callout:none;
  -ms-writing-mode:tb-rl;
  -webkit-writing-mode:vertical-rl;
  writing-mode:vertical-rl;
}

:root:lang(mn-Mong){
  -ms-writing-mode:tb;
  -webkit-writing-mode:vertical-lr;
  writing-mode:vertical-lr;
}

body{
  width:100%;
  max-height:var(--RS__defaultLineLength) !important;
  margin:auto 0 !important;
  box-sizing:border-box;
}

:root:not([style*="readium-scroll-on"]) body{
  padding:var(--RS__pageGutter) 0 !important;
}

:root:not([style*="readium-noOverflow-on"]) body{
  overflow:hidden;
}

@supports (overflow: clip){

  :root:not([style*="readium-noOverflow-on"]){
     overflow:clip;
  }

  :root:not([style*="readium-noOverflow-on"]) body{
     overflow:clip;
     overflow-clip-margin:content-box;
  }
}

:root[style*="readium-scroll-on"],
:root[style*="readium-noVerticalPagination-on"]{
  -webkit-columns:auto auto !important;
  -moz-columns:auto auto !important;
  columns:auto auto !important;
  width:auto !important;
  max-width:none !important;
  max-height:100vh !important;
  min-width:0 !important;
}

:root[style*="readium-scroll-on"] body,
:root[style*="readium-noVerticalPagination-on"] body{
  max-width:var(--RS__defaultLineLength) !important;
  box-sizing:border-box !important;
}

@supports (overflow: clip){

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]){
     overflow:auto;
  }

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
     overflow:clip;
  }
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingTop"] body{
  padding-top:var(--RS__scrollPaddingTop) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingBottom"] body{
  padding-bottom:var(--RS__scrollPaddingBottom) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingLeft"] body{
  padding-left:var(--RS__scrollPaddingLeft) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingRight"] body{
  padding-right:var(--RS__scrollPaddingRight) !important;
}

:root[style*="--USER__backgroundColor"]{
  background-color:var(--USER__backgroundColor) !important;
}

:root[style*="--USER__backgroundColor"] *{
  background-color:transparent !important;
}

:root[style*="--USER__textColor"]{
  color:var(--USER__textColor) !important;
}

:root[style*="--USER__textColor"] *:not(a){
  color:inherit !important;
  background-color:transparent !important;
  border-color:currentcolor !important;
}

:root[style*="--USER__textColor"] svg text{
  fill:currentcolor !important;
  stroke:none !important;
}

:root[style*="--USER__linkColor"] a:link,
:root[style*="--USER__linkColor"] a:link *{
  color:var(--USER__linkColor) !important;
}

:root[style*="--USER__visitedColor"] a:visited,
:root[style*="--USER__visitedColor"] a:visited *{
  color:var(--USER__visitedColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::-moz-selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__lineLength"] body{
    max-height:var(--USER__lineLength) !important;
  }

:root[style*="--USER__fontFamily"]{
  font-family:var(--USER__fontFamily) !important;
}

:root[style*="--USER__fontFamily"] *{
  font-family:revert !important;
}

:root:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] body{
  zoom:var(--USER__fontSize) !important;
}

:root:not([style*="readium-deprecatedFontSize-on"])[style*="readium-iOSPatch-on"][style*="--USER__fontSize"] body{
  -webkit-text-size-adjust:var(--USER__fontSize) !important;
}

@supports selector(figure:has(> img)){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> img),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> video),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> svg),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> canvas),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> iframe),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> audio),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> img:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> video:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> svg:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> canvas:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> iframe:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> audio:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] table{
    zoom:calc(100% / var(--USER__fontSize)) !important;
  }

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figcaption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] caption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] td,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] th{
    zoom:var(--USER__fontSize) !important;
  }
}

@supports not (zoom: 1){

  :root[style*="--USER__fontSize"]{
    font-size:var(--USER__fontSize) !important;
  }
}

:root[style*="readium-deprecatedFontSize-on"][style*="--USER__fontSize"]{
  font-size:var(--USER__fontSize) !important;
}

:root[style*="--USER__lineHeight"]{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__lineHeight"] body,
:root[style*="--USER__lineHeight"] p,
:root[style*="--USER__lineHeight"] li,
:root[style*="--USER__lineHeight"] div{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__paraSpacing"] p{
  margin-right:var(--USER__paraSpacing) !important;
  margin-left:var(--USER__paraSpacing) !important;
}

:root[style*="--USER__fontWeight"] body{
  font-weight:var(--USER__fontWeight) !important;
}

:root[style*="--USER__fontWeight"] b,
:root[style*="--USER__fontWeight"] strong{
  font-weight:bolder;
}

:root[style*="--USER__fontWidth"] body{
  font-stretch:var(--USER__fontWidth) !important;
}

:root[style*="--USER__fontOpticalSizing"] body{
  font-optical-sizing:var(--USER__fontOpticalSizing) !important;
}

:root[style*="--USER__letterSpacing"] h1,
:root[style*="--USER__letterSpacing"] h2,
:root[style*="--USER__letterSpacing"] h3,
:root[style*="--USER__letterSpacing"] h4,
:root[style*="--USER__letterSpacing"] h5,
:root[style*="--USER__letterSpacing"] h6,
:root[style*="--USER__letterSpacing"] p,
:root[style*="--USER__letterSpacing"] li,
:root[style*="--USER__letterSpacing"] div,
:root[style*="--USER__letterSpacing"] dt,
:root[style*="--USER__letterSpacing"] dd{
  letter-spacing:var(--USER__letterSpacing) !important;
  font-variant:none !important;
}

:root[style*="readium-noRuby-on"] body rt,
:root[style*="readium-noRuby-on"] body rp{
  display:none;
}

:root[style*="readium-blend-on"] svg,
:root[style*="readium-blend-on"] img{
  background-color:transparent !important;
  mix-blend-mode:multiply !important;
}

:root[style*="--USER__darkenImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) !important;
  filter:brightness(var(--USER__darkenImages)) !important;
}

:root[style*="readium-darken-on"] img{
  -webkit-filter:brightness(80%) !important;
  filter:brightness(80%) !important;
}

:root[style*="--USER__invertImages"] img{
  -webkit-filter:invert(var(--USER__invertImages)) !important;
  filter:invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-invert-on"] img{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="--USER__darkenImages"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
  filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-darken-on"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(80%) invert(var(--USER__invertImages)) !important;
  filter:brightness(80%) invert(var(--USER__invertImages)) !important;
}

:root[style*="--USER__darkenImages"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
  filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
}

:root[style*="readium-darken-on"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(80%) invert(100%) !important;
  filter:brightness(80%) invert(100%) !important;
}

:root[style*="--USER__invertGaiji"] img[class*="gaiji"]{
  -webkit-filter:invert(var(--USER__invertGaiji)) !important;
  filter:invert(var(--USER__invertGaiji)) !important;
}

:root[style*="readium-invertGaiji-on"] img[class*="gaiji"]{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="readium-normalize-on"]{
  --USER__typeScale:1.2;
}

:root[style*="readium-normalize-on"] p,
:root[style*="readium-normalize-on"] li,
:root[style*="readium-normalize-on"] div,
:root[style*="readium-normalize-on"] pre,
:root[style*="readium-normalize-on"] dd{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] h1{
  font-size:1.75rem !important;
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h2{
  font-size:1.5rem !important;
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h3{
  font-size:1.25rem !important;
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h4,
:root[style*="readium-normalize-on"] h5,
:root[style*="readium-normalize-on"] h6{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] small{
  font-size:smaller !important;
}

:root[style*="readium-normalize-on"] sub,
:root[style*="readium-normalize-on"] sup{
  font-size:67.5% !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h1{
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h2{
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h3{
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-iPadOSPatch-on"] body{
  -webkit-text-size-adjust:none;
}

:root[style*="readium-iPadOSPatch-on"] p, 
:root[style*="readium-iPadOSPatch-on"] h1, 
:root[style*="readium-iPadOSPatch-on"] h2, 
:root[style*="readium-iPadOSPatch-on"] h3, 
:root[style*="readium-iPadOSPatch-on"] h4, 
:root[style*="readium-iPadOSPatch-on"] h5, 
:root[style*="readium-iPadOSPatch-on"] h6, 
:root[style*="readium-iPadOSPatch-on"] li, 
:root[style*="readium-iPadOSPatch-on"] th, 
:root[style*="readium-iPadOSPatch-on"] td, 
:root[style*="readium-iPadOSPatch-on"] dt, 
:root[style*="readium-iPadOSPatch-on"] dd, 
:root[style*="readium-iPadOSPatch-on"] pre, 
:root[style*="readium-iPadOSPatch-on"] address, 
:root[style*="readium-iPadOSPatch-on"] details, 
:root[style*="readium-iPadOSPatch-on"] summary,
:root[style*="readium-iPadOSPatch-on"] figcaption,
:root[style*="readium-iPadOSPatch-on"] div:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)),
:root[style*="readium-iPadOSPatch-on"] aside:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)){
  -webkit-text-zoom:reset;
}

:root[style*="readium-iPadOSPatch-on"] abbr, 
:root[style*="readium-iPadOSPatch-on"] b, 
:root[style*="readium-iPadOSPatch-on"] bdi, 
:root[style*="readium-iPadOSPatch-on"] bdo, 
:root[style*="readium-iPadOSPatch-on"] cite, 
:root[style*="readium-iPadOSPatch-on"] code, 
:root[style*="readium-iPadOSPatch-on"] dfn, 
:root[style*="readium-iPadOSPatch-on"] em, 
:root[style*="readium-iPadOSPatch-on"] i, 
:root[style*="readium-iPadOSPatch-on"] kbd, 
:root[style*="readium-iPadOSPatch-on"] mark, 
:root[style*="readium-iPadOSPatch-on"] q, 
:root[style*="readium-iPadOSPatch-on"] rp, 
:root[style*="readium-iPadOSPatch-on"] rt, 
:root[style*="readium-iPadOSPatch-on"] ruby, 
:root[style*="readium-iPadOSPatch-on"] s, 
:root[style*="readium-iPadOSPatch-on"] samp, 
:root[style*="readium-iPadOSPatch-on"] small, 
:root[style*="readium-iPadOSPatch-on"] span, 
:root[style*="readium-iPadOSPatch-on"] strong, 
:root[style*="readium-iPadOSPatch-on"] sub, 
:root[style*="readium-iPadOSPatch-on"] sup, 
:root[style*="readium-iPadOSPatch-on"] time, 
:root[style*="readium-iPadOSPatch-on"] u, 
:root[style*="readium-iPadOSPatch-on"] var{
  -webkit-text-zoom:normal;
}

:root[style*="readium-iPadOSPatch-on"] p:not(:has(b, cite, em, i, q, s, small, span, strong)):first-line{
  -webkit-text-zoom:normal;
}`});var vl={};vt(vl,{default:()=>xd});var xd,wl=gt(()=>{p();xd=`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017\u20132026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickae\u0308l Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

@-ms-viewport{
  width:device-width;
}

@viewport{
  width:device-width;
  zoom:1;
}

:root{

  --RS__sans-serif-ja-v:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', '\u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDGothic', 'Yu Gothic', '\uFF2D\uFF33\u30B4\u30B7\u30C3\u30AF', 'MS Gothic', sans-serif;

  --RS__serif-ja-v:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDMincho', 'Yu Mincho', '\uFF2D\uFF33\u660E\u671D', 'MS Mincho', serif;

  --RS__sans-serif-ja:'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hiragino Kaku Gothic Pro', '\u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 W3', 'YuGothic', 'Yu Gothic Medium', 'BIZ UDPGothic', 'Yu Gothic', '\uFF2D\uFF33 \uFF30\u30B4\u30B7\u30C3\u30AF', 'MS PGothic', sans-serif;

  --RS__serif-ja:'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'YuMincho', 'BIZ UDPMincho', 'Yu Mincho', '\uFF2D\uFF33 \uFF30\u660E\u671D', 'MS PMincho', serif;

  --RS__monospaceTf:ui-monospace, 'Andale Mono', 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;

  --RS__humanistTf:Seravek, Calibri, 'Gill Sans Nova', Roboto, Ubuntu, 'DejaVu Sans', source-sans-pro, sans-serif;

  --RS__sansTf:-ui-sans-serif, -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Liberation Sans', Arial, sans-serif;

  --RS__modernTf:Athelas, Constantia, Charter, 'Bitstream Charter', Cambria, 'Georgia Pro', Georgia, serif;

  --RS__oldStyleTf:'Iowan Old Style', Sitka, 'Sitka Text', Palatino, 'Book Antiqua', 'URW Palladio L', P052, serif;

  --RS__zh-HK-lineHeightCompensation:1.167;

  --RS__zh-HK-baseFontFamily:'\u65B9\u9AD4', 'PingFang HK', '\u65B9\u9AD4', 'PingFang TC', '\u9ED1\u9AD4', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-TW-lineHeightCompensation:1.167;

  --RS__zh-TW-baseFontFamily:'\u65B9\u9AD4', 'PingFang TC', '\u9ED1\u9AD4', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-Hant-lineHeightCompensation:1.167;

  --RS__zh-Hant-baseFontFamily:'\u65B9\u9AD4', 'PingFang TC', '\u9ED1\u9AD4', 'Heiti TC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK TC', sans-serif;

  --RS__zh-lineHeightCompensation:1.167;

  --RS__zh-baseFontFamily:'\u65B9\u4F53', 'PingFang SC', '\u9ED1\u4F53', 'Heiti SC', 'Microsoft JhengHei UI', 'Microsoft JhengHei', Roboto, Noto, 'Noto Sans CJK SC', sans-serif;

  --RS__th-lineHeightCompensation:1.067;

  --RS__th-baseFontFamily:Thonburi, 'Leelawadee UI', 'Cordia New', Roboto, Noto, 'Noto Sans Thai', sans-serif;

  --RS__te-baseFontFamily:'Kohinoor Telugu', 'Telugu Sangam MN', 'Nirmala UI', Gautami, Roboto, Noto, 'Noto Sans Telugu', sans-serif;

  --RS__ta-lineHeightCompensation:1.067;

  --RS__ta-baseFontFamily:'Tamil Sangam MN', 'Nirmala UI', Latha, Roboto, Noto, 'Noto Sans Tamil', sans-serif;

  --RS__si-lineHeightCompensation:1.167;

  --RS__si-baseFontFamily:'Sinhala Sangam MN', 'Nirmala UI', 'Iskoola Pota', Roboto, Noto, 'Noto Sans Sinhala', sans-serif;

  --RS__pa-lineHeightCompensation:1.1;

  --RS__pa-baseFontFamily:'Gurmukhi MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Gurmukhi', sans-serif;

  --RS__or-lineHeightCompensation:1.167;

  --RS__or-baseFontFamily:'Oriya Sangam MN', 'Nirmala UI', Kalinga, Roboto, Noto, 'Noto Sans Oriya', sans-serif;

  --RS__ml-lineHeightCompensation:1.067;

  --RS__ml-baseFontFamily:'Malayalam Sangam MN', 'Nirmala UI', Kartika, Roboto, Noto, 'Noto Sans Malayalam', sans-serif;

  --RS__lo-baseFontFamily:'Lao Sangam MN', 'Leelawadee UI', 'Lao UI', Roboto, Noto, 'Noto Sans Lao', sans-serif;

  --RS__ko-lineHeightCompensation:1.167;

  --RS__ko-baseFontFamily:'Nanum Gothic', 'Apple SD Gothic Neo', 'Malgun Gothic', Roboto, Noto, 'Noto Sans CJK KR', sans-serif;

  --RS__kn-lineHeightCompensation:1.1;

  --RS__kn-baseFontFamily:'Kannada Sangam MN', 'Nirmala UI', Tunga, Roboto, Noto, 'Noto Sans Kannada', sans-serif;

  --RS__km-lineHeightCompensation:1.067;

  --RS__km-baseFontFamily:'Khmer Sangam MN', 'Leelawadee UI', 'Khmer UI', Roboto, Noto, 'Noto Sans Khmer', sans-serif;

  --RS__ja-lineHeightCompensation:1.167;

  --RS__ja-baseFontFamily:YuGothic, 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo UI', 'MS Gothic', Roboto, Noto, 'Noto Sans CJK JP', sans-serif;

  --RS__iu-baseFontFamily:'Euphemia UCAS', Euphemia, Roboto, Noto, 'Noto Sans Canadian Aboriginal', sans-serif;

  --RS__hy-baseFontFamily:Mshtakan, Sylfaen, Roboto, Noto, 'Noto Serif Armenian', serif;

  --RS__hi-lineHeightCompensation:1.1;

  --RS__hi-baseFontFamily:'Kohinoor Devanagari', 'Devanagari Sangam MN', Kokila, 'Nirmala UI', Roboto, Noto, 'Noto Sans Devanagari', sans-serif;

  --RS__he-lineHeightCompensation:1.1;

  --RS__he-baseFontFamily:'New Peninim MT', 'Arial Hebrew', Gisha, 'Times New Roman', Roboto, Noto, 'Noto Sans Hebrew', sans-serif;

  --RS__gu-lineHeightCompensation:1.167;

  --RS__gu-baseFontFamily:'Gujarati Sangam MN', 'Nirmala UI', Shruti, Roboto, Noto, 'Noto Sans Gujarati', sans-serif;

  --RS__fa-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__chr-lineHeightCompensation:1.167;

  --RS__chr-baseFontFamily:'Plantagenet Cherokee', Roboto, Noto, 'Noto Sans Cherokee';

  --RS__bo-baseFontFamily:Kailasa, 'Microsoft Himalaya', Roboto, Noto, 'Noto Sans Tibetan', sans-serif;

  --RS__bn-lineHeightCompensation:1.067;

  --RS__bn-baseFontFamily:'Kohinoor Bangla', 'Bangla Sangam MN', Vrinda, Roboto, Noto, 'Noto Sans Bengali', sans-serif;

  --RS__ar-baseFontFamily:'Geeza Pro', 'Arabic Typesetting', Roboto, Noto, 'Noto Naskh Arabic', 'Times New Roman', serif;

  --RS__am-lineHeightCompensation:1.167;

  --RS__am-baseFontFamily:Kefa, Nyala, Roboto, Noto, 'Noto Sans Ethiopic', serif;

  --RS__latin-lineHeightCompensation:1;

  --RS__latin-baseFontFamily:var(--RS__oldStyleTf);
  --RS__baseFontFamily:var(--RS__latin-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__latin-lineHeightCompensation);
  --RS__baseLineHeight:calc(1.5 * var(--RS__lineHeightCompensation));

  --RS__selectionTextColor:inherit;

  --RS__selectionBackgroundColor:#b4d8fe;

  --RS__visitedColor:#551A8B;

  --RS__linkColor:#0000EE;

  --RS__textColor:#121212;

  --RS__backgroundColor:#FFFFFF;
  color:var(--RS__textColor) !important;

  background-color:var(--RS__backgroundColor) !important;
}

::-moz-selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

::selection{
  color:var(--RS__selectionTextColor);
  background-color:var(--RS__selectionBackgroundColor);
}

html{
  font-family:var(--RS__baseFontFamily);
  line-height:1.6;
  line-height:var(--RS__baseLineHeight);
  text-rendering:optimizelegibility;
}

h1, h2, h3{
  line-height:normal;
}

:lang(ja),
:lang(zh),
:lang(ko){
  word-wrap:break-word;
  -webkit-line-break:strict;
  -epub-line-break:strict;
  line-break:strict;
}

math{
  font-family:"Latin Modern Math", "STIX Two Math", "XITS Math", "STIX Math", "Libertinus Math", "TeX Gyre Termes Math", "TeX Gyre Bonum Math", "TeX Gyre Schola", "DejaVu Math TeX Gyre", "TeX Gyre Pagella Math", "Asana Math", "Cambria Math", "Lucida Bright Math", "Minion Math", STIXGeneral, STIXSizeOneSym, Symbol, "Times New Roman", serif;
}

:lang(am){
  --RS__baseFontFamily:var(--RS__am-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__am-lineHeightCompensation);
}

:lang(ar){
  --RS__baseFontFamily:var(--RS__ar-baseFontFamily);
}

:lang(bn){
  --RS__baseFontFamily:var(--RS__bn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__bn-lineHeightCompensation);
}

:lang(bo){
  --RS__baseFontFamily:var(--RS__bo-baseFontFamily);
}

:lang(chr){
  --RS__baseFontFamily:var(--RS__chr-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__chr-lineHeightCompensation);
}

:lang(fa){
  --RS__baseFontFamily:var(--RS__fa-baseFontFamily);
}

:lang(gu){
  --RS__baseFontFamily:var(--RS__gu-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__gu-lineHeightCompensation);
}

:lang(he){
  --RS__baseFontFamily:var(--RS__he-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__he-lineHeightCompensation);
}

:lang(hi){
  --RS__baseFontFamily:var(--RS__hi-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__hi-lineHeightCompensation);
}

:lang(hy){
  --RS__baseFontFamily:var(--RS__hy-baseFontFamily);
}

:lang(iu){
  --RS__baseFontFamily:var(--RS__iu-baseFontFamily);
}

:lang(ja){
  --RS__baseFontFamily:var(--RS__ja-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ja-lineHeightCompensation);
}

:lang(km){
  --RS__baseFontFamily:var(--RS__km-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__km-lineHeightCompensation);
}

:lang(kn){
  --RS__baseFontFamily:var(--RS__kn-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__kn-lineHeightCompensation);
}

:lang(ko){
  --RS__baseFontFamily:var(--RS__ko-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ko-lineHeightCompensation);
}

:lang(lo){
  --RS__baseFontFamily:var(--RS__lo-baseFontFamily);
}

:lang(ml){
  --RS__baseFontFamily:var(--RS__ml-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ml-lineHeightCompensation);
}

:lang(or){
  --RS__baseFontFamily:var(--RS__or-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__or-lineHeightCompensation);
}

:lang(pa){
  --RS__baseFontFamily:var(--RS__pa-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__pa-lineHeightCompensation);
}

:lang(si){
  --RS__baseFontFamily:var(--RS__si-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__si-lineHeightCompensation);
}

:lang(ta){
  --RS__baseFontFamily:var(--RS__ta-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__ta-lineHeightCompensation);
}

:lang(te){
  --RS__baseFontFamily:var(--RS__te-baseFontFamily);
}

:lang(th){
  --RS__baseFontFamily:var(--RS__th-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__th-lineHeightCompensation);
}

:lang(zh){
  --RS__baseFontFamily:var(--RS__zh-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-lineHeightCompensation);
}

:lang(zh-Hant){
  --RS__baseFontFamily:var(--RS__zh-Hant-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-Hant-lineHeightCompensation);
}

:lang(zh-TW){
  --RS__baseFontFamily:var(--RS__zh-TW-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-TW-lineHeightCompensation);
}

:lang(zh-HK){
  --RS__baseFontFamily:var(--RS__zh-HK-baseFontFamily);
  --RS__lineHeightCompensation:var(--RS__zh-HK-lineHeightCompensation);
}

body{
  widows:2;
  orphans:2;
}

figcaption, th, td{
  widows:1;
  orphans:1;
}

h2, h3, h4, h5, h6, dt,
hr, caption{
  -webkit-column-break-after:avoid;
  page-break-after:avoid;
  break-after:avoid;
}

h1, h2, h3, h4, h5, h6, dt,
figure, tr{
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

body{
  -webkit-hyphenate-character:"\\002D";
  -moz-hyphenate-character:"\\002D";
  -ms-hyphenate-character:"\\002D";
  hyphenate-character:"\\002D";
  -webkit-hyphenate-limit-lines:3;
  -ms-hyphenate-limit-lines:3;
  hyphenate-limit-lines:3;
}

h1, h2, h3, h4, h5, h6, dt,
figcaption, pre, caption, address,
center, code, var{
  -ms-hyphens:none;
  -moz-hyphens:none;
  -webkit-hyphens:none;
  -epub-hyphens:none;
  hyphens:none;
}

body{
  font-variant-numeric:oldstyle-nums proportional-nums;
}

:lang(ja) body,
:lang(zh) body,
:lang(ko) body{
  font-variant-numeric:lining-nums proportional-nums;
}

h1, h2, h3, h4, h5, h6, dt{
  font-variant-numeric:lining-nums proportional-nums;
}

table{
  font-variant-numeric:lining-nums tabular-nums;
}

code, var{
  font-variant-ligatures:none;
  font-variant-numeric:lining-nums tabular-nums slashed-zero;
}

rt{
  font-variant-east-asian:ruby;
}

:lang(ar){
  font-variant-ligatures:common-ligatures;
}

:lang(ko){
  font-kerning:normal;
}

hr{
  color:inherit;
  border-color:currentcolor;
}

table, th, td{
  border-color:currentcolor;
}

figure, blockquote{
  margin:1em 5%;
}

ul, ol{
  padding-left:5%;
}

dd{
  margin-left:5%;
}

pre{
  white-space:pre-wrap;
  -ms-tab-size:2;
  -moz-tab-size:2;
  -webkit-tab-size:2;
  tab-size:2;
}

abbr[title], acronym[title]{
  text-decoration:dotted underline;
}

nobr wbr{
  white-space:normal;
}

ruby > rt, ruby > rp{
  -webkit-user-select:none;
  -moz-user-select:none;
  -ms-user-select:none;
  user-select:none;
}

*:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)),
*:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)),
*:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)),
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) cite, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) dfn, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) em, 
:lang(ja):not(:lang(ja-Latn)):not(:lang(ja-Cyrl)) i,
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) cite, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) dfn, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) em, 
:lang(zh):not(:lang(zh-Latn)):not(:lang(zh-Cyrl)) i,
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) cite, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) dfn, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) em, 
:lang(ko):not(:lang(ko-Latn)):not(:lang(ko-Cyrl)) i{
  font-style:normal;
}

:lang(ja) a,
:lang(zh) a,
:lang(ko) a{
  text-decoration:none;
}

:root{
  --RS__maxMediaWidth:100%;
  --RS__maxMediaHeight:95vh;
  --RS__boxSizingMedia:border-box;
  --RS__boxSizingTable:border-box;
}

a, a span, span a, h1, h2, h3, h4, h5, h6{
  word-wrap:break-word;
}

div{
  max-width:var(--RS__maxMediaWidth);
}

img, svg|svg, video{
  object-fit:contain;

  width:auto;
  height:auto;
  max-width:var(--RS__maxMediaWidth);
  max-height:var(--RS__maxMediaHeight) !important;
  box-sizing:var(--RS__boxSizingMedia);
  -webkit-column-break-inside:avoid;
  page-break-inside:avoid;
  break-inside:avoid;
}

@supports (zoom: 1) and (not ((-webkit-column-axis: horizontal) and (-webkit-column-progression: normal))){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] img,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] svg|svg,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] video{
    zoom:calc(100% / var(--USER__fontSize));
  }
}

audio{
    max-width:100%;
    -webkit-column-break-inside:avoid;
    page-break-inside:avoid;
    break-inside:avoid;
  }

table{
  max-width:var(--RS__maxMediaWidth);
  box-sizing:var(--RS__boxSizingTable);
}`});var Rl={};vt(Rl,{default:()=>Pd});var Pd,Cl=gt(()=>{p();Pd=`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017\u20132026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickae\u0308l Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{
  --RS__compFontFamily:var(--RS__baseFontFamily);
  --RS__codeFontFamily:var(--RS__monospaceTf);

  --RS__typeScale:1.125;
  --RS__baseFontSize:100%;

  --RS__flowSpacing:1.5rem;
  --RS__paraSpacing:0;
  --RS__paraIndent:1em;

  --RS__linkColor:#0000EE;
  --RS__visitedColor:#551A8B;

  --RS__primaryColor:;
  --RS__secondaryColor:;
}

body{
  font-size:var(--RS__baseFontSize);
}

h1, h2, h3, h4, h5, h6{
  font-family:var(--RS__compFontFamily);
}

blockquote, figure, p, pre,
aside, footer, form, hr{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
}

p{
  margin-top:var(--RS__paraSpacing);
  margin-bottom:var(--RS__paraSpacing);
  text-indent:var(--RS__paraIndent);
}

h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p,
hr + p{
  text-indent:0;
}

pre{
  font-family:var(--RS__codeFontFamily);
}

code, kbd, samp, tt{
  font-family:var(--RS__codeFontFamily);
}

sub, sup{
  position:relative;
  font-size:67.5%;
  line-height:1;
}

sub{
  bottom:-0.2ex;
}

sup{
  bottom:0;
}

:link{
  color:var(--RS__linkColor);
}

:visited{
  color:var(--RS__visitedColor);
}

h1{
  margin-top:calc(var(--RS__flowSpacing) * 2);
  margin-bottom:calc(var(--RS__flowSpacing) * 2);
  font-size:calc(((1em * var(--RS__typeScale)) * var(--RS__typeScale)) * var(--RS__typeScale));
}

h2{
  margin-top:calc(var(--RS__flowSpacing) * 2);
  margin-bottom:var(--RS__flowSpacing);
  font-size:calc((1em * var(--RS__typeScale)) * var(--RS__typeScale));
}

h3{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:calc(1em * var(--RS__typeScale));
}

h4{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:1em;
}

h5{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
  font-size:1em;
  font-variant:small-caps;
}

h6{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:0;
  font-size:1em;
  text-transform:lowercase;
  font-variant:small-caps;
}

dl, ol, ul{
  margin-top:var(--RS__flowSpacing);
  margin-bottom:var(--RS__flowSpacing);
}

table{
  margin:var(--RS__flowSpacing) 0;
  border:1px solid currentcolor;
  border-collapse:collapse;
  empty-cells:show;
}

thead, tbody, tfoot, table > tr{
  vertical-align:top;
}

th{
  text-align:left;
}

th, td{
  padding:4px;
  border:1px solid currentcolor;
}`});var El={};vt(El,{default:()=>Fd});var Fd,xl=gt(()=>{p();Fd=`/*!
 * Readium CSS v.2.0.5
 * Copyright (c) 2017\u20132026. Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license which is detailed in the
 * LICENSE file present in the project repository where this source code is maintained.
 * Core maintainer: Jiminy Panoz <jiminy.panoz@edrlab.org> 
 * Contributors: 
 * Daniel Weck
 * Hadrien Gardeur
 * Innovimax
 * L. Le Meur
 * Mickae\u0308l Menu
 * k_taka
 */

@namespace url("http://www.w3.org/1999/xhtml");

@namespace epub url("http://www.idpf.org/2007/ops");

@namespace m url("http://www.w3.org/1998/Math/MathML");

@namespace svg url("http://www.w3.org/2000/svg");

:root{

  --RS__viewportWidth:100%;

  --RS__pageGutter:0;

  --RS__defaultLineLength:100%;

  --RS__colGap:0;

  --RS__colCount:1;

  --RS__colWidth:100vw;
}

@page{
  margin:0 !important;
}

:root{
  position:relative;

  -webkit-column-width:var(--RS__colWidth);
  -moz-column-width:var(--RS__colWidth);
  column-width:var(--RS__colWidth);
  -webkit-column-count:var(--RS__colCount);
  -moz-column-count:var(--RS__colCount);
  column-count:var(--RS__colCount);

  -webkit-column-gap:var(--RS__colGap);
  -moz-column-gap:var(--RS__colGap);
  column-gap:var(--RS__colGap);
  -moz-column-fill:auto;
  column-fill:auto;
  width:var(--RS__viewportWidth);
  height:100vh;
  max-width:var(--RS__viewportWidth);
  max-height:100vh;
  min-width:var(--RS__viewportWidth);
  min-height:100vh;
  padding:0 !important;
  margin:0 !important;
  font-size:1rem !important;
  box-sizing:border-box;
  -webkit-touch-callout:none;
}

body{
  width:100%;
  max-width:var(--RS__defaultLineLength) !important;
  margin:0 auto !important;
  box-sizing:border-box;
}

:root:not([style*="readium-scroll-on"]) body{
  padding:0 var(--RS__pageGutter) !important;
}

:root:not([style*="readium-noOverflow-on"]) body{
  overflow:hidden;
}

@supports (overflow: clip){

   :root:not([style*="readium-noOverflow-on"]){
      overflow:clip;
   }

   :root:not([style*="readium-noOverflow-on"]) body{
      overflow:clip;
      overflow-clip-margin:content-box;
   }
}

:root[style*="readium-scroll-on"]{
  -webkit-columns:auto auto !important;
  -moz-columns:auto auto !important;
  columns:auto auto !important;
  width:auto !important;
  height:auto !important;
  max-width:none !important;
  max-height:none !important;
  min-width:0 !important;
  min-height:0 !important;
}

:root[style*="readium-scroll-on"] body{
  max-width:var(--RS__defaultLineLength) !important;
  box-sizing:border-box !important;
}

:root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
  overflow:auto;
}

@supports (overflow: clip){

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]){
     overflow:auto;
  }

  :root[style*="readium-scroll-on"]:not([style*="readium-noOverflow-on"]) body{
     overflow:clip;
  }
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingTop"] body{
  padding-top:var(--RS__scrollPaddingTop) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingBottom"] body{
  padding-bottom:var(--RS__scrollPaddingBottom) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingLeft"] body{
  padding-left:var(--RS__scrollPaddingLeft) !important;
}

:root[style*="readium-scroll-on"][style*="--RS__scrollPaddingRight"] body{
  padding-right:var(--RS__scrollPaddingRight) !important;
}

:root[style*="--USER__backgroundColor"]{
  background-color:var(--USER__backgroundColor) !important;
}

:root[style*="--USER__backgroundColor"] *{
  background-color:transparent !important;
}

:root[style*="--USER__textColor"]{
  color:var(--USER__textColor) !important;
}

:root[style*="--USER__textColor"] *:not(a){
  color:inherit !important;
  background-color:transparent !important;
  border-color:currentcolor !important;
}

:root[style*="--USER__textColor"] svg text{
  fill:currentcolor !important;
  stroke:none !important;
}

:root[style*="--USER__linkColor"] a:link,
:root[style*="--USER__linkColor"] a:link *{
  color:var(--USER__linkColor) !important;
}

:root[style*="--USER__visitedColor"] a:visited,
:root[style*="--USER__visitedColor"] a:visited *{
  color:var(--USER__visitedColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::-moz-selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__selectionBackgroundColor"][style*="--USER__selectionTextColor"] ::selection{
  color:var(--USER__selectionTextColor) !important;
  background-color:var(--USER__selectionBackgroundColor) !important;
}

:root[style*="--USER__colCount"]{
  -webkit-column-count:var(--USER__colCount);
  -moz-column-count:var(--USER__colCount);
  column-count:var(--USER__colCount);

  --RS__colWidth:auto;
}

:root[style*="--USER__colCount: 0"],
:root[style*="--USER__colCount:0"]{
  -webkit-column-count:1;
  -moz-column-count:1;
  column-count:1;
}

:root[style*="--USER__colCount: 0"],
:root[style*="--USER__colCount:0"],
:root[style*="--USER__colCount: 1"],
:root[style*="--USER__colCount:1"]{
  --RS__colWidth:100vw;
}

:root[style*="--USER__lineLength"] body{
    max-width:var(--USER__lineLength) !important;
  }

:root[style*="--USER__textAlign"]{
  text-align:var(--USER__textAlign);
}

:root[style*="--USER__textAlign"] body,
:root[style*="--USER__textAlign"] p:not(
  blockquote p,
  figcaption p,
  header p,
  hgroup p,
  :root[style*="readium-experimentalHeaderFiltering-on"] p[class*="title"],
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > h1 + p,
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > p:has(+ h1)
),
:root[style*="--USER__textAlign"] li,
:root[style*="--USER__textAlign"] dd{
  text-align:var(--USER__textAlign) !important;
  -moz-text-align-last:auto !important;
  -epub-text-align-last:auto !important;
  text-align-last:auto !important;
}

:root[style*="--USER__bodyHyphens"]{
  -webkit-hyphens:var(--USER__bodyHyphens) !important;
  -moz-hyphens:var(--USER__bodyHyphens) !important;
  -ms-hyphens:var(--USER__bodyHyphens) !important;
  -epub-hyphens:var(--USER__bodyHyphens) !important;
  hyphens:var(--USER__bodyHyphens) !important;
}

:root[style*="--USER__bodyHyphens"] body,
:root[style*="--USER__bodyHyphens"] p,
:root[style*="--USER__bodyHyphens"] li,
:root[style*="--USER__bodyHyphens"] div,
:root[style*="--USER__bodyHyphens"] dd{
  -webkit-hyphens:var(--USER__bodyHyphens) !important;
  -moz-hyphens:var(--USER__bodyHyphens) !important;
  -ms-hyphens:var(--USER__bodyHyphens) !important;
  -epub-hyphens:var(--USER__bodyHyphens) !important;
  hyphens:var(--USER__bodyHyphens) !important;
}

:root[style*="--USER__fontFamily"]{
  font-family:var(--USER__fontFamily) !important;
}

:root[style*="--USER__fontFamily"] *{
  font-family:revert !important;
}

:root[style*="readium-a11y-on"]{
  font-style:normal !important;
  font-weight:normal !important;
}

:root[style*="readium-a11y-on"] body *:not(code):not(var):not(kbd):not(samp){
  font-family:inherit !important;
  font-style:inherit !important;
  font-weight:inherit !important;
}

:root[style*="readium-a11y-on"] body *:not(a){
  text-decoration:none !important;
}

:root[style*="readium-a11y-on"] body *{
  font-variant-caps:normal !important;
  font-variant-numeric:normal !important;
  font-variant-position:normal !important;
}

:root[style*="readium-a11y-on"] sup,
:root[style*="readium-a11y-on"] sub{
  font-size:1rem !important;
  vertical-align:baseline !important;
}

:root:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] body{
  zoom:var(--USER__fontSize) !important;
}

:root:not([style*="readium-deprecatedFontSize-on"])[style*="readium-iOSPatch-on"][style*="--USER__fontSize"] body{
  -webkit-text-size-adjust:var(--USER__fontSize) !important;
}

@supports selector(figure:has(> img)){

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> img),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> video),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> svg),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> canvas),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> iframe),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figure:has(> audio),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> img:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> video:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> svg:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> canvas:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> iframe:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] div:has(> audio:only-child),
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] table{
    zoom:calc(100% / var(--USER__fontSize)) !important;
  }

  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] figcaption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] caption,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] td,
  :root[style*="readium-experimentalZoom-on"]:not([style*="readium-deprecatedFontSize-on"]):not([style*="readium-iOSPatch-on"])[style*="--USER__fontSize"] th{
    zoom:var(--USER__fontSize) !important;
  }
}

@supports not (zoom: 1){

  :root[style*="--USER__fontSize"]{
    font-size:var(--USER__fontSize) !important;
  }
}

:root[style*="readium-deprecatedFontSize-on"][style*="--USER__fontSize"]{
  font-size:var(--USER__fontSize) !important;
}

:root[style*="--USER__lineHeight"]{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__lineHeight"] body,
:root[style*="--USER__lineHeight"] p,
:root[style*="--USER__lineHeight"] li,
:root[style*="--USER__lineHeight"] div{
  line-height:var(--USER__lineHeight) !important;
}

:root[style*="--USER__paraSpacing"] p{
  margin-top:var(--USER__paraSpacing) !important;
  margin-bottom:var(--USER__paraSpacing) !important;
}

:root[style*="--USER__paraIndent"] p:not(
  blockquote p,
  figcaption p,
  header p,
  hgroup p,
  :root[style*="readium-experimentalHeaderFiltering-on"] p[class*="title"],
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > h1 + p,
  :root[style*="readium-experimentalHeaderFiltering-on"] div:has(+ *) > p:has(+ h1)
){
  text-indent:var(--USER__paraIndent) !important;
}

:root[style*="--USER__paraIndent"] p *{
  text-indent:0 !important;
}

:root[style*="--USER__wordSpacing"] h1,
:root[style*="--USER__wordSpacing"] h2,
:root[style*="--USER__wordSpacing"] h3,
:root[style*="--USER__wordSpacing"] h4,
:root[style*="--USER__wordSpacing"] h5,
:root[style*="--USER__wordSpacing"] h6,
:root[style*="--USER__wordSpacing"] p,
:root[style*="--USER__wordSpacing"] li,
:root[style*="--USER__wordSpacing"] div,
:root[style*="--USER__wordSpacing"] dt,
:root[style*="--USER__wordSpacing"] dd{
  word-spacing:var(--USER__wordSpacing) !important;
}

:root[style*="--USER__letterSpacing"] h1,
:root[style*="--USER__letterSpacing"] h2,
:root[style*="--USER__letterSpacing"] h3,
:root[style*="--USER__letterSpacing"] h4,
:root[style*="--USER__letterSpacing"] h5,
:root[style*="--USER__letterSpacing"] h6,
:root[style*="--USER__letterSpacing"] p,
:root[style*="--USER__letterSpacing"] li,
:root[style*="--USER__letterSpacing"] div,
:root[style*="--USER__letterSpacing"] dt,
:root[style*="--USER__letterSpacing"] dd{
  letter-spacing:var(--USER__letterSpacing) !important;
  font-variant:none !important;
}

:root[style*="--USER__ligatures"]{
  font-variant-ligatures:var(--USER__ligatures) !important;
}

:root[style*="--USER__ligatures"] *{
  font-variant-ligatures:inherit !important;
}

:root[style*="--USER__fontWeight"] body{
  font-weight:var(--USER__fontWeight) !important;
}

:root[style*="--USER__fontWeight"] b,
:root[style*="--USER__fontWeight"] strong{
  font-weight:bolder;
}

:root[style*="--USER__fontWidth"] body{
  font-stretch:var(--USER__fontWidth) !important;
}

:root[style*="--USER__fontOpticalSizing"] body{
  font-optical-sizing:var(--USER__fontOpticalSizing) !important;
}

:root[style*="readium-blend-on"] svg,
:root[style*="readium-blend-on"] img{
  background-color:transparent !important;
  mix-blend-mode:multiply !important;
}

:root[style*="--USER__darkenImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) !important;
  filter:brightness(var(--USER__darkenImages)) !important;
}

:root[style*="readium-darken-on"] img{
  -webkit-filter:brightness(80%) !important;
  filter:brightness(80%) !important;
}

:root[style*="--USER__invertImages"] img{
  -webkit-filter:invert(var(--USER__invertImages)) !important;
  filter:invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-invert-on"] img{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="--USER__darkenImages"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
  filter:brightness(var(--USER__darkenImages)) invert(var(--USER__invertImages)) !important;
}

:root[style*="readium-darken-on"][style*="--USER__invertImages"] img{
  -webkit-filter:brightness(80%) invert(var(--USER__invertImages)) !important;
  filter:brightness(80%) invert(var(--USER__invertImages)) !important;
}

:root[style*="--USER__darkenImages"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
  filter:brightness(var(--USER__darkenImages)) invert(100%) !important;
}

:root[style*="readium-darken-on"][style*="readium-invert-on"] img{
  -webkit-filter:brightness(80%) invert(100%) !important;
  filter:brightness(80%) invert(100%) !important;
}

:root[style*="--USER__invertGaiji"] img[class*="gaiji"]{
  -webkit-filter:invert(var(--USER__invertGaiji)) !important;
  filter:invert(var(--USER__invertGaiji)) !important;
}

:root[style*="readium-invertGaiji-on"] img[class*="gaiji"]{
  -webkit-filter:invert(100%) !important;
  filter:invert(100%) !important;
}

:root[style*="readium-normalize-on"]{
  --USER__typeScale:1.2;
}

:root[style*="readium-normalize-on"] p,
:root[style*="readium-normalize-on"] li,
:root[style*="readium-normalize-on"] div,
:root[style*="readium-normalize-on"] pre,
:root[style*="readium-normalize-on"] dd{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] h1{
  font-size:1.75rem !important;
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h2{
  font-size:1.5rem !important;
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h3{
  font-size:1.25rem !important;
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"] h4,
:root[style*="readium-normalize-on"] h5,
:root[style*="readium-normalize-on"] h6{
  font-size:1rem !important;
}

:root[style*="readium-normalize-on"] small{
  font-size:smaller !important;
}

:root[style*="readium-normalize-on"] sub,
:root[style*="readium-normalize-on"] sup{
  font-size:67.5% !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h1{
  font-size:calc(((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h2{
  font-size:calc((1rem * var(--USER__typeScale)) * var(--USER__typeScale)) !important;
}

:root[style*="readium-normalize-on"][style*="--USER__typeScale"] h3{
  font-size:calc(1rem * var(--USER__typeScale)) !important;
}

:root[style*="readium-iPadOSPatch-on"] body{
  -webkit-text-size-adjust:none;
}

:root[style*="readium-iPadOSPatch-on"] p, 
:root[style*="readium-iPadOSPatch-on"] h1, 
:root[style*="readium-iPadOSPatch-on"] h2, 
:root[style*="readium-iPadOSPatch-on"] h3, 
:root[style*="readium-iPadOSPatch-on"] h4, 
:root[style*="readium-iPadOSPatch-on"] h5, 
:root[style*="readium-iPadOSPatch-on"] h6, 
:root[style*="readium-iPadOSPatch-on"] li, 
:root[style*="readium-iPadOSPatch-on"] th, 
:root[style*="readium-iPadOSPatch-on"] td, 
:root[style*="readium-iPadOSPatch-on"] dt, 
:root[style*="readium-iPadOSPatch-on"] dd, 
:root[style*="readium-iPadOSPatch-on"] pre, 
:root[style*="readium-iPadOSPatch-on"] address, 
:root[style*="readium-iPadOSPatch-on"] details, 
:root[style*="readium-iPadOSPatch-on"] summary,
:root[style*="readium-iPadOSPatch-on"] figcaption,
:root[style*="readium-iPadOSPatch-on"] div:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)),
:root[style*="readium-iPadOSPatch-on"] aside:not(:has(p, h1, h2, h3, h4, h5, h6, li, th, td, dt, dd, pre, address, aside, details, figcaption, summary)){
  -webkit-text-zoom:reset;
}

:root[style*="readium-iPadOSPatch-on"] abbr, 
:root[style*="readium-iPadOSPatch-on"] b, 
:root[style*="readium-iPadOSPatch-on"] bdi, 
:root[style*="readium-iPadOSPatch-on"] bdo, 
:root[style*="readium-iPadOSPatch-on"] cite, 
:root[style*="readium-iPadOSPatch-on"] code, 
:root[style*="readium-iPadOSPatch-on"] dfn, 
:root[style*="readium-iPadOSPatch-on"] em, 
:root[style*="readium-iPadOSPatch-on"] i, 
:root[style*="readium-iPadOSPatch-on"] kbd, 
:root[style*="readium-iPadOSPatch-on"] mark, 
:root[style*="readium-iPadOSPatch-on"] q, 
:root[style*="readium-iPadOSPatch-on"] rp, 
:root[style*="readium-iPadOSPatch-on"] rt, 
:root[style*="readium-iPadOSPatch-on"] ruby, 
:root[style*="readium-iPadOSPatch-on"] s, 
:root[style*="readium-iPadOSPatch-on"] samp, 
:root[style*="readium-iPadOSPatch-on"] small, 
:root[style*="readium-iPadOSPatch-on"] span, 
:root[style*="readium-iPadOSPatch-on"] strong, 
:root[style*="readium-iPadOSPatch-on"] sub, 
:root[style*="readium-iPadOSPatch-on"] sup, 
:root[style*="readium-iPadOSPatch-on"] time, 
:root[style*="readium-iPadOSPatch-on"] u, 
:root[style*="readium-iPadOSPatch-on"] var{
  -webkit-text-zoom:normal;
}

:root[style*="readium-iPadOSPatch-on"] p:not(:has(b, cite, em, i, q, s, small, span, strong)):first-line{
  -webkit-text-zoom:normal;
}`});var Pl={};vt(Pl,{default:()=>kd});var kd,Fl=gt(()=>{p();kd=`/* Readium CSS
   EBPAJ Fonts Patch module

   A stylesheet improving EBPAJ @font-face declarations to cover all platforms

   Repo: https://github.com/readium/css */

/* EBPAJ template only references fonts from MS Windows\u2026
   so we must reference fonts from other platforms
   and override authors\u2019 stylesheets.
   What we do there is keeping their default value and providing fallbacks.

   /!\\ /!\\ /!\\ /!\\ /!\\
   FYI, you might want to load this polyfill only if you find
   one of the following metadata items in the OPF package:
   - version 1:
     <dc:description id="ebpaj-guide">ebpaj-guide-1.0</dc:description>
   - version 1.1:
     <meta property="ebpaj:guide-version">1.1</meta>
*/

/* 
   Hiragino PostScript Font name lists:
   https://www.screen.co.jp/ga_product/sento/support/QA/ss_psname.html
*/

/* \u6A2A\u7D44\u307F\u7528 (horizontal writing) */

@font-face {
  font-family: "serif-ja";
  src: local("\uFF2D\uFF33 \uFF30\u660E\u671D"), /* for IE */
      local("MS PMincho"), /* \uFF2D\uFF33 \uFF30\u660E\u671D */
      local("HiraMinProN-W3"), local("Hiragino Mincho ProN"), /* \u30D2\u30E9\u30AE\u30CE\u660E\u671D ProN W3 */
      local("HiraMinPro-W3"), local("Hiragino Mincho Pro"), /* \u30D2\u30E9\u30AE\u30CE\u660E\u671D Pro W3 */
      local("YuMin-Medium"), local("YuMincho"), /* \u6E38\u660E\u671D\u4F53(macOS) */
      local("Yu Mincho"), /* \u6E38\u660E\u671D(Windows) */
      local("BIZ UDPMincho"); /* BIZ UDP\u660E\u671D */
}

@font-face {
  font-family: "sans-serif-ja";
  src: local("\uFF2D\uFF33 \uFF30\u30B4\u30B7\u30C3\u30AF"), /* for IE */
       local("MS PGothic"), /* \uFF2D\uFF33 \uFF30\u30B4\u30B7\u30C3\u30AF */
       local("HiraginoSans-W3"), local("Hiragino Sans"), /* \u30D2\u30E9\u30AE\u30CE\u89D2\u30B4\u30B7\u30C3\u30AF */
       local("HiraKakuProN-W3"), local("Hiragino Kaku Gothic ProN"), /* \u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 ProN W3 */
       local("HiraKakuPro-W3"), local("Hiragino Kaku Gothic Pro"), /* \u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 Pro W3 */
       local("\u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 W3"), /* for old  Safari */
       local("HiraginoKaku-W3-90msp-RKSJ-H"), /* \u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 W3(TrueType) */
       local("YuGothic-Medium"), local("YuGothic"), /* \u6E38\u30B4\u30B7\u30C3\u30AF\u4F53(macOS) */
       local("Yu Gothic Medium"), local("Yu Gothic"), /* \u6E38\u30B4\u30B7\u30C3\u30AF(Windows) "Yu Gothic" is a fallback. */
       local("BIZ UDPGothic"); /* BIZ UDP\u30B4\u30B7\u30C3\u30AF */
}

/* \u7E26\u7D44\u307F\u7528 (vertical writing) */

@font-face {
  font-family: "serif-ja-v";
  src: local("\uFF2D\uFF33 \u660E\u671D"), /* for IE */
       local("MS Mincho"), /* \uFF2D\uFF33 \u660E\u671D */
       local("HiraMinProN-W3"), local("Hiragino Mincho ProN"), /* \u30D2\u30E9\u30AE\u30CE\u660E\u671D ProN W3 */
       local("HiraMinPro-W3"), local("Hiragino Mincho Pro"), /* \u30D2\u30E9\u30AE\u30CE\u660E\u671D Pro W3 */
       local("YuMin-Medium"), local("YuMincho"), /* \u6E38\u660E\u671D\u4F53(macOS) */
       local("Yu Mincho"), /* \u6E38\u660E\u671D(Windows) */
       local("BIZ UDMincho"); /*  BIZ UD\u660E\u671D */
}

@font-face {
  font-family: "sans-serif-ja-v";
  src: local("\uFF2D\uFF33 \u30B4\u30B7\u30C3\u30AF"), /* for IE */
       local("MS Gothic"), /* \uFF2D\uFF33 \u30B4\u30B7\u30C3\u30AF */
       local("HiraginoSans-W3"), local("Hiragino Sans"), /* \u30D2\u30E9\u30AE\u30CE\u89D2\u30B4\u30B7\u30C3\u30AF */
       local("HiraKakuProN-W3"), local("Hiragino Kaku Gothic ProN"), /* \u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 ProN W3 */
       local("HiraKakuPro-W3"), local("Hiragino Kaku Gothic Pro"), /* \u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 Pro W3 */
       local("\u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 W3"), /* for old Safari */
       local("HiraKakuDS-W3-83pv-RKSJ-H"), /* \u30D2\u30E9\u30AE\u30CE\u89D2\u30B4 W3(TrueType) */
       local("YuGothic-Medium"), local("YuGothic"), /* \u6E38\u30B4\u30B7\u30C3\u30AF\u4F53(macOS) */
       local("Yu Gothic Medium"), local("Yu Gothic"), /* \u6E38\u30B4\u30B7\u30C3\u30AF(Windows)  "Yu Gothic" is a fallback. */
       local("BIZ UDGothic"); /* BIZ UD\u30B4\u30B7\u30C3\u30AF */
}`});p();p();p();p();p();var Ai=class{close(){}links(){return[]}get(t){throw Error("This is an empty fetcher")}};p();var ni=class{readAsString(){return this.read().then(t=>t===void 0?t:new TextDecoder().decode(t))}readAsJSON(){return this.readAsString().then(t=>t===void 0?t:JSON.parse(t))}readAsXML(){return this.link().then(t=>this.readAsString().then(e=>e===void 0?e:new DOMParser().parseFromString(e,t.mediaType.isHTML?t.mediaType.essence:"text/xml")))}};p();p();function Vo(n){return n&&Array.isArray(n)?n:void 0}function tt(n){return n&&typeof n=="string"?[n]:Vo(n)}function $o(n){return typeof n=="string"?new Date(n):void 0}function he(n){return isNaN(n)?void 0:n}function wt(n){return he(n)!==void 0&&Math.sign(n)>=0?n:void 0}function ce(n){let t=new Array;return n.forEach(e=>t.push(e)),t}var Mi=class n{constructor(t={}){var e,i,o,r,s,a,l,h;this.conformsTo=(e=t.conformsTo)!=null?e:[],this.certification=(i=t.certification)!=null?i:null,this.summary=(o=t.summary)!=null?o:null,this.accessMode=(r=t.accessMode)!=null?r:[],this.accessModeSufficient=(s=t.accessModeSufficient)!=null?s:[],this.feature=(a=t.feature)!=null?a:[],this.hazard=(l=t.hazard)!=null?l:[],this.exemption=(h=t.exemption)!=null?h:[]}static deserialize(t){if(!t||typeof t!="object")return;let e=t,i=tt(e.conformsTo),o=tt(e.accessMode),r=Vo(e.accessModeSufficient),s=tt(e.feature),a=tt(e.hazard),l=tt(e.exemption);return new n({conformsTo:i?i.map(h=>ph.deserialize(h)).filter(h=>h!==void 0):void 0,certification:e.certification?Xo.deserialize(e.certification):void 0,summary:e.summary,accessMode:o?o.map(h=>gh.deserialize(h)).filter(h=>h!==void 0):void 0,accessModeSufficient:r?r.map(h=>fh.deserialize(h)).filter(h=>h!==void 0):void 0,feature:s?s.map(h=>Sh.deserialize(h)).filter(h=>h!==void 0):void 0,hazard:a?a.map(h=>yh.deserialize(h)).filter(h=>h!==void 0):void 0,exemption:l?l.map(h=>_h.deserialize(h)).filter(h=>h!==void 0):void 0})}serialize(){var e,i,o,r,s,a;let t={};return((e=this.conformsTo)==null?void 0:e.length)>0&&(t.conformsTo=this.conformsTo.map(l=>l.serialize())),this.certification!==void 0&&this.certification!==null&&(t.certification=this.certification.serialize()),this.summary!==void 0&&this.summary!==null&&(t.summary=this.summary),((i=this.accessMode)==null?void 0:i.length)>0&&(t.accessMode=this.accessMode.map(l=>l.serialize())),((o=this.accessModeSufficient)==null?void 0:o.length)>0&&(t.accessModeSufficient=this.accessModeSufficient.map(l=>l.serialize())),((r=this.feature)==null?void 0:r.length)>0&&(t.feature=this.feature.map(l=>l.serialize())),((s=this.hazard)==null?void 0:s.length)>0&&(t.hazard=this.hazard.map(l=>l.serialize())),((a=this.exemption)==null?void 0:a.length)>0&&(t.exemption=this.exemption.map(l=>l.serialize())),t}},j=class ft{constructor(t){this.uri=t}static deserialize(t){if(!(!t||typeof t!="string"))return new ft(t)}serialize(){return this.uri}get isWCAGLevelA(){return this===ft.EPUB_A11Y_10_WCAG_20_A||this===ft.EPUB_A11Y_11_WCAG_20_A||this===ft.EPUB_A11Y_11_WCAG_21_A||this===ft.EPUB_A11Y_11_WCAG_22_A}get isWCAGLevelAA(){return this===ft.EPUB_A11Y_10_WCAG_20_AA||this===ft.EPUB_A11Y_11_WCAG_20_AA||this===ft.EPUB_A11Y_11_WCAG_21_AA||this===ft.EPUB_A11Y_11_WCAG_22_AA}get isWCAGLevelAAA(){return this===ft.EPUB_A11Y_10_WCAG_20_AAA||this===ft.EPUB_A11Y_11_WCAG_20_AAA||this===ft.EPUB_A11Y_11_WCAG_21_AAA||this===ft.EPUB_A11Y_11_WCAG_22_AAA}};j.EPUB_A11Y_10_WCAG_20_A=new j("http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-a"),j.EPUB_A11Y_10_WCAG_20_AA=new j("http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa"),j.EPUB_A11Y_10_WCAG_20_AAA=new j("http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aaa"),j.EPUB_A11Y_11_WCAG_20_A=new j("https://www.w3.org/TR/epub-a11y-11#wcag-2.0-a"),j.EPUB_A11Y_11_WCAG_20_AA=new j("https://www.w3.org/TR/epub-a11y-11#wcag-2.0-aa"),j.EPUB_A11Y_11_WCAG_20_AAA=new j("https://www.w3.org/TR/epub-a11y-11#wcag-2.0-aaa"),j.EPUB_A11Y_11_WCAG_21_A=new j("https://www.w3.org/TR/epub-a11y-11#wcag-2.1-a"),j.EPUB_A11Y_11_WCAG_21_AA=new j("https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aa"),j.EPUB_A11Y_11_WCAG_21_AAA=new j("https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aaa"),j.EPUB_A11Y_11_WCAG_22_A=new j("https://www.w3.org/TR/epub-a11y-11#wcag-2.2-a"),j.EPUB_A11Y_11_WCAG_22_AA=new j("https://www.w3.org/TR/epub-a11y-11#wcag-2.2-aa"),j.EPUB_A11Y_11_WCAG_22_AAA=new j("https://www.w3.org/TR/epub-a11y-11#wcag-2.2-aaa");var ph=j,Xo=class n{constructor(t=null,e=null,i=null){this.certifiedBy=t,this.credential=e,this.report=i}static deserialize(t){if(!(!t||typeof t!="object"))return new n(t.certifiedBy,t.credential,t.report)}serialize(){let t={};return this.certifiedBy&&(t.certifiedBy=this.certifiedBy),this.credential&&(t.credential=this.credential),this.report&&(t.report=this.report),t}},$=class Mr{constructor(t){this.value=t}static deserialize(t){if(!(!t||typeof t!="string"))return new Mr(t)}serialize(){return this.value}};$.AUDITORY=new $("auditory"),$.CHART_ON_VISUAL=new $("chartOnVisual"),$.CHEM_ON_VISUAL=new $("chemOnVisual"),$.COLOR_DEPENDENT=new $("colorDependent"),$.DIAGRAM_ON_VISUAL=new $("diagramOnVisual"),$.MATH_ON_VISUAL=new $("mathOnVisual"),$.MUSIC_ON_VISUAL=new $("musicOnVisual"),$.TACTILE=new $("tactile"),$.TEXT_ON_VISUAL=new $("textOnVisual"),$.TEXTUAL=new $("textual"),$.VISUAL=new $("visual");var gh=$,Lt=class de{constructor(t){if(typeof t=="string"){if(!de.VALID_MODES.has(t.toLowerCase()))return;this.value=t.toLowerCase()}else{let e=t.filter(i=>de.VALID_MODES.has(i.toLowerCase()));if(e.length===0)return;this.value=Array.from(new Set(e))}}static deserialize(t){if(!t)return;if(typeof t=="string")return de.VALID_MODES.has(t.toLowerCase())?new de(t):void 0;if(!Array.isArray(t))return;let e=t.filter(i=>i?de.VALID_MODES.has(i.toLowerCase()):!1);if(e.length!==0)return new de(e)}serialize(){return this.value}};Lt.VALID_MODES=new Set(["auditory","tactile","textual","visual"]),Lt.AUDITORY=new Lt("auditory"),Lt.TACTILE=new Lt("tactile"),Lt.TEXTUAL=new Lt("textual"),Lt.VISUAL=new Lt("visual");var fh=Lt,E=class Nr{constructor(t){this.value=t}static deserialize(t){if(!(!t||typeof t!="string"))return new Nr(t)}serialize(){return this.value}};E.NONE=new E("none"),E.ANNOTATIONS=new E("annotations"),E.ARIA=new E("ARIA"),E.INDEX=new E("index"),E.PAGE_BREAK_MARKERS=new E("pageBreakMarkers"),E.PAGE_NAVIGATION=new E("pageNavigation"),E.PRINT_PAGE_NUMBERS=new E("printPageNumbers"),E.READING_ORDER=new E("readingOrder"),E.STRUCTURAL_NAVIGATION=new E("structuralNavigation"),E.TABLE_OF_CONTENTS=new E("tableOfContents"),E.TAGGED_PDF=new E("taggedPDF"),E.ALTERNATIVE_TEXT=new E("alternativeText"),E.AUDIO_DESCRIPTION=new E("audioDescription"),E.CAPTIONS=new E("captions"),E.CLOSED_CAPTIONS=new E("closedCaptions"),E.DESCRIBED_MATH=new E("describedMath"),E.LONG_DESCRIPTION=new E("longDescription"),E.OPEN_CAPTIONS=new E("openCaptions"),E.SIGN_LANGUAGE=new E("signLanguage"),E.TRANSCRIPT=new E("transcript"),E.DISPLAY_TRANSFORMABILITY=new E("displayTransformability"),E.SYNCHRONIZED_AUDIO_TEXT=new E("synchronizedAudioText"),E.TIMING_CONTROL=new E("timingControl"),E.UNLOCKED=new E("unlocked"),E.CHEM_ML=new E("ChemML"),E.LATEX=new E("latex"),E.LATEX_CHEMISTRY=new E("latex-chemistry"),E.MATH_ML=new E("MathML"),E.MATH_ML_CHEMISTRY=new E("MathML-chemistry"),E.TTS_MARKUP=new E("ttsMarkup"),E.HIGH_CONTRAST_AUDIO=new E("highContrastAudio"),E.HIGH_CONTRAST_DISPLAY=new E("highContrastDisplay"),E.LARGE_PRINT=new E("largePrint"),E.BRAILLE=new E("braille"),E.TACTILE_GRAPHIC=new E("tactileGraphic"),E.TACTILE_OBJECT=new E("tactileObject"),E.FULL_RUBY_ANNOTATIONS=new E("fullRubyAnnotations"),E.HORIZONTAL_WRITING=new E("horizontalWriting"),E.RUBY_ANNOTATIONS=new E("rubyAnnotations"),E.VERTICAL_WRITING=new E("verticalWriting"),E.WITH_ADDITIONAL_WORD_SEGMENTATION=new E("withAdditionalWordSegmentation"),E.WITHOUT_ADDITIONAL_WORD_SEGMENTATION=new E("withoutAdditionalWordSegmentation");var Sh=E,X=class Dr{constructor(t){this.value=t}static deserialize(t){if(!(!t||typeof t!="string"))return new Dr(t)}serialize(){return this.value}};X.FLASHING=new X("flashing"),X.NO_FLASHING_HAZARD=new X("noFlashingHazard"),X.UNKNOWN_FLASHING_HAZARD=new X("unknownFlashingHazard"),X.MOTION_SIMULATION=new X("motionSimulation"),X.NO_MOTION_SIMULATION_HAZARD=new X("noMotionSimulationHazard"),X.UNKNOWN_MOTION_SIMULATION_HAZARD=new X("unknownMotionSimulationHazard"),X.SOUND=new X("sound"),X.NO_SOUND_HAZARD=new X("noSoundHazard"),X.UNKNOWN_SOUND_HAZARD=new X("unknownSoundHazard"),X.UNKNOWN=new X("unknown"),X.NONE=new X("none");var yh=X,Y=class Ur{constructor(t){this.value=t}static deserialize(t){if(!(!t||typeof t!="string"))return new Ur(t)}serialize(){return this.value}};Y.NONE=new Y("none"),Y.DOCUMENTED=new Y("documented"),Y.LEGAL=new Y("legal"),Y.TEMPORARY=new Y("temporary"),Y.TECHNICAL=new Y("technical"),Y.EAA_DISPROPORTIONATE_BURDEN=new Y("eaa-disproportionate-burden"),Y.EAA_FUNDAMENTAL_ALTERATION=new Y("eaa-fundamental-alteration"),Y.EAA_MICROENTERPRISE=new Y("eaa-microenterprise"),Y.EAA_TECHNICAL_IMPOSSIBILITY=new Y("eaa-technical-impossibility"),Y.EAA_TEMPORARY=new Y("eaa-temporary");var _h=Y;p();var F=(n=>(n.reflowable="reflowable",n.fixed="fixed",n.scrolled="scrolled",n))(F||{});p();p();var ri=class n{constructor(t){this.cssSelector=t.cssSelector,this.textNodeIndex=t.textNodeIndex,this.charOffset=t.charOffset}static deserialize(t){if(!(t&&t.cssSelector))return;let e=wt(t.textNodeIndex);if(e===void 0)return;let i=wt(t.charOffset);return i===void 0&&(i=wt(t.offset)),new n({cssSelector:t.cssSelector,textNodeIndex:e,charOffset:i})}serialize(){let t={cssSelector:this.cssSelector,textNodeIndex:this.textNodeIndex};return this.charOffset!==void 0&&(t.charOffset=this.charOffset),t}};var Ni=class n{constructor(t){this.start=t.start,this.end=t.end}static deserialize(t){if(!t)return;let e=ri.deserialize(t.start);if(e)return new n({start:e,end:ri.deserialize(t.end)})}serialize(){let t={start:this.start.serialize()};return this.end&&(t.end=this.end.serialize()),t}};p();p();function ue(n){let t=n.split(",")[0].trim(),e=(t.toLowerCase().startsWith("npt:")?t.slice(4):t).split(":");if(e.length===1){let i=parseFloat(e[0]);return isNaN(i)?void 0:i}if(e.length===2){let i=parseInt(e[0],10),o=parseFloat(e[1]);return isNaN(i)||isNaN(o)?void 0:i*60+o}if(e.length===3){let i=parseInt(e[0],10),o=parseInt(e[1],10),r=parseFloat(e[2]);return isNaN(i)||isNaN(o)||isNaN(r)?void 0:i*3600+o*60+r}}function Ir(n){let t=ue(n);return t!==void 0&&t===0}function Hr(n){let t=Math.floor(n),e=Math.floor(t/3600),i=Math.floor(t%3600/60),o=t%60,r=String(i).padStart(2,"0"),s=String(o).padStart(2,"0");return e>0?`${e}:${r}:${s}`:`${i}:${s}`}p();p();var Di=null,Ko=null,si=0,Ae={r:255,g:255,b:255,a:1},Le=new Map,bh=()=>{if(!Di)if(typeof OffscreenCanvas<"u")Di=new OffscreenCanvas(5,5),Ko=Di.getContext("2d",{willReadFrequently:!0,desynchronized:!0});else{let n=document.createElement("canvas");n.width=5,n.height=5,Di=n,Ko=n.getContext("2d",{willReadFrequently:!0,desynchronized:!0})}return Ko},vh=n=>{if(!n)return!0;let t=n.trim().toLowerCase();return t.startsWith("var(")||["transparent","currentcolor","inherit","initial","revert","unset","revert-layer"].includes(t)?!0:["linear-gradient","radial-gradient","conic-gradient","repeating-linear-gradient","repeating-radial-gradient","repeating-conic-gradient"].some(e=>t.includes(e))},Ui=(n,t)=>{console.warn(`[@readium/helpers] Could not parse color: "${n}". ${t} Falling back to ${JSON.stringify(Ae)} to compute contrast. Please use a CSS color value that can be computed to RGB(A).`)},Bt=(n,t=null)=>{let e=t?`${n}|${t}`:n,i=Le.get(e);if(i!==void 0)return i!=null?i:Ae;if(vh(n))return Ui(n,"Unsupported color format or special value."),Le.set(e,null),Ae;let o=bh();if(!o)return Ui(n,"Could not get canvas context."),Le.set(e,null),Ae;try{si===0&&o.clearRect(0,0,5,5);let r=si%5,s=Math.floor(si/5);o.clearRect(r,s,1,1),t&&(o.fillStyle=t,o.fillRect(r,s,1,1)),o.fillStyle=n,o.fillRect(r,s,1,1);let a=o.getImageData(r,s,1,1);si=(si+1)%25;let[l,h,c,d]=a.data;if(d===0)return Ui(n,"Fully transparent color."),Le.set(e,null),Ae;let u={r:l,g:h,b:c,a:d/255};return Le.set(e,u),u}catch(r){return Ui(n,`Error: ${r instanceof Error?r.message:String(r)}`),Le.set(e,null),Ae}},Yo=n=>{let t=n/255;return t<=.03928?t/12.92:Math.pow((t+.055)/1.055,2.4)},Ii=n=>{let t=Yo(n.r),e=Yo(n.g),i=Yo(n.b);return .2126*t+.7152*e+.0722*i},ai=(n,t)=>{let e=typeof n=="string"?Bt(n):n,i=typeof t=="string"?Bt(t):t,o=Ii(e),r=Ii(i),s=Math.max(o,r),a=Math.min(o,r);return(s+.05)/(a+.05)},Hi=(n,t=null)=>{let e=Bt(n,t),i=ai(e,{r:255,g:255,b:255,a:1}),o=ai(e,{r:0,g:0,b:0,a:1});return i>o};var Wi=(n,t=null)=>Hi(n,t)?"white":"black",wh=n=>{let t=n.a!==void 0?n.a:1;return`rgba(${Math.round(n.r)}, ${Math.round(n.g)}, ${Math.round(n.b)}, ${t})`},Rh=(n,t)=>{var e;return{r:Math.min(255,n.r+(255-n.r)*t),g:Math.min(255,n.g+(255-n.g)*t),b:Math.min(255,n.b+(255-n.b)*t),a:(e=n.a)!=null?e:1}},Ch=(n,t)=>{var e;return{r:Math.max(0,n.r*(1-t)),g:Math.max(0,n.g*(1-t)),b:Math.max(0,n.b*(1-t)),a:(e=n.a)!=null?e:1}},jt=(n,t=null,e=3)=>{var c;let i=Bt(n),o=t?Bt(t):{r:255,g:255,b:255,a:1},r=ai(i,o);if(r>=e)return n;let s=Ii(o)<.5,a={...i,a:(c=i.a)!=null?c:1},l=20,h=.1;for(let d=0;d<l&&(s?a=Rh(a,h):a=Ch(a,h),r=ai(a,o),!(r>=e));d++);return wh(a)};p();function Gt(n){return n.replace(/(?:%[0-9A-Fa-f]{2})+/g,t=>{try{return decodeURIComponent(t)}catch{return t}})}p();var Wr=()=>typeof navigator>"u"?"":navigator.userAgent||"",Br=()=>typeof navigator>"u"?void 0:navigator.userAgentData||void 0,Bi=class{constructor(){let t=Br(),e=Wr(),i=r=>(typeof r=="string"||typeof r=="number")&&r?String(r).replace(/_/g,".").split(".").map(s=>parseInt(s)||0):[],o=(r="")=>{if(!r)return[];let s=new RegExp("^.*"+r+"[ :\\/]?(\\d+([\\._]\\d+)*).*$");return s.test(e)?i(e.replace(s,"$1")):[]};this.OS=(r=>(/(macOS|Mac OS X)/.test(e)?(/\(iP(hone|od touch);/.test(e)&&(r.iOS=o("CPU (?:iPhone )?OS ")),/\(iPad;/.test(e)?r.iOS=r.iPadOS=o("CPU (?:iPhone )?OS "):/(macOS|Mac OS X) \d/.test(e)&&(document.ontouchend!==void 0?r.iOS=r.iPadOS=o():r.macOS=o("(?:macOS|Mac OS X) "))):/Windows( NT)? \d/.test(e)?r.Windows=(s=>s[0]!==6||!s[1]?s:s[1]===1?[7]:s[1]===2?[8]:[8,1])(o("Windows(?: NT)?")):/Android \d/.test(e)?r.Android=o("Android"):/CrOS/.test(e)?r.ChromeOS=o():/X11;/.test(e)&&(r.Linux=o()),r))({}),t&&t.getHighEntropyValues(["architecture","model","platform","platformVersion","uaFullVersion"]).then(r=>(s=>{let a=r.platform,l=r.platformVersion;if(!(!a||!l)){if(/^i(OS|P(hone|od touch))$/.test(a))s.iOS=i(l);else if(/^iPad(OS)?$/.test(a))s.iOS=s.iPadOS=i(l);else if(/^(macOS|(Mac )?OS X|Mac(Intel)?)$/.test(a))document.ontouchend!==void 0?s.iOS=s.iPadOS=i():s.macOS=i(l);else if(/^(Microsoft )?Windows$/.test(a))s.Windows=i(l);else if(/^(Google )?Android$/.test(a))s.Android=i(l);else if(/^((Google )?Chrome OS|CrOS)$/.test(a))s.ChromeOS=i(l);else if(/^(Linux|Ubuntu|X11)$/.test(a))s.Linux=i(l);else return;Object.keys(this.OS).forEach(h=>delete this.OS[h]),Object.assign(this.OS,s)}})({})),this.UA=(r=>{let s=!1;if(t&&Array.isArray(t.brands)){let a=t.brands.reduce((l,h)=>(l[h.brand]=[h.version*1],l),{});a["Google Chrome"]?(s=!0,r.Blink=r.Chromium=a.Chromium||[],r.Chrome=a["Google Chrome"]):a["Microsoft Edge"]?(s=!0,r.Blink=r.Chromium=a.Chromium||[],r.Edge=a["Microsoft Edge"]):a.Opera&&(s=!0,r.Blink=r.Chromium=a.Chromium||[],r.Opera=a.Opera)}return s||(/ Gecko\/\d/.test(e)?(r.Gecko=o("rv"),/ Waterfox\/\d/.test(e)?r.Waterfox=o("Waterfox"):/ Firefox\/\d/.test(e)&&(r.Firefox=o("Firefox"))):/ Edge\/\d/.test(e)?(r.EdgeHTML=o("Edge"),r.Edge=r.EdgeHTML):/ Chrom(ium|e)\/\d/.test(e)?(r.Blink=r.Chromium=(a=>a[0]?a:o("Chrome"))(o("Chromium")),/ EdgA?\/\d/.test(e)?r.Edge=(a=>a[0]?a:o("Edg"))(o("EdgA")):/ OPR\/\d/.test(e)?r.Opera=o("OPR"):/ Vivaldi\/\d/.test(e)?r.Vivaldi=o("Vivaldi"):/ Silk\/\d/.test(e)?r.Silk=o("Silk"):/ UCBrowser\/\d/.test(e)?r.UCBrowser=o("UCBrowser"):/ Phoebe\/\d/.test(e)?r.Phoebe=o("Phoebe"):r.Chrome=(a=>a[0]?a:r.Chromium)(o("Chrome"))):/ AppleWebKit\/\d/.test(e)?(r.WebKit=o("AppleWebKit"),/ CriOS \d/.test(e)?r.Chrome=o("CriOS"):/ FxiOS \d/.test(e)?r.Firefox=o("FxiOS"):/ EdgiOS\/\d/.test(e)?r.Edge=o("EdgiOS"):/ Version\/\d/.test(e)&&(r.Safari=o("Version"))):/ Trident\/\d/.test(e)&&(r.Trident=o("Trident"),r.InternetExplorer=(a=>a[0]?a:o("MSIE"))(o("rv")))),/[\[; ]FB(AN|_IAB)\//.test(e)&&(r.Facebook=o("FBAV")),/ Line\/\d/.test(e)&&(r.LINE=o("Line")),r})({}),this.Env={get:()=>[this.OS,this.UA].reduce((r,s)=>{for(let a in s)s[a]&&r.push(a);return r},[])}}},qo=class extends Bi{get iOSRequest(){let t=Br(),e=Wr();if(this.OS.iOS&&!this.OS.iPadOS)return"mobile";if(this.OS.iPadOS)return/\(iPad;/.test(e)||t&&/^iPad(OS)?$/.test(t.platform)?"mobile":"desktop"}},et=new Bi,Rt=new qo;p();var jr=":~:text=";function Jo(n){if(!n)return;let t=n.indexOf(jr);if(t===-1)return;let e=n.slice(t+jr.length).split("&")[0];if(e)try{let i=e.split(","),o={textStart:""};return i.length>1&&i[0].endsWith("-")&&(o.prefix=decodeURIComponent(i[0].slice(0,-1)),i=i.slice(1)),i.length>1&&i[i.length-1].startsWith("-")&&(o.suffix=decodeURIComponent(i[i.length-1].slice(1)),i=i.slice(0,-1)),i.length===0||i[0]===""?void 0:(o.textStart=decodeURIComponent(i[0]),i.length>1&&(o.textEnd=decodeURIComponent(i[1])),o)}catch{return}}p();var Eh=["ADDRESS","ARTICLE","ASIDE","BLOCKQUOTE","BR","DETAILS","DIALOG","DD","DIV","DL","DT","FIELDSET","FIGCAPTION","FIGURE","FOOTER","FORM","H1","H2","H3","H4","H5","H6","HEADER","HGROUP","HR","LI","MAIN","NAV","OL","P","PRE","SECTION","TABLE","UL","TR","TH","TD","COLGROUP","COL","CAPTION","THEAD","TBODY","TFOOT"],ji=/[\t-\r -#%-\*,-\/:;\?@\[-\]_\{\}\x85\xA0\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u1680\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2000-\u200A\u2010-\u2029\u202F-\u2043\u2045-\u2051\u2053-\u205F\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E44\u3000-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC9\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDF3C-\uDF3E]|\uD807[\uDC41-\uDC45\uDC70\uDC71]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/u;var Zo=(n,t,e)=>{let i=[],o=t.createRange();for(o.selectNodeContents(e!=null?e:t);!o.collapsed&&i.length<2;){let r;if(n.prefix){let s=li(n.prefix,o);if(s==null)break;Gi(o,s.startContainer,s.startOffset);let a=t.createRange();if(a.setStart(s.endContainer,s.endOffset),a.setEnd(o.endContainer,o.endOffset),$r(a),a.collapsed||(r=li(n.textStart,a),r==null))break;if(r.compareBoundaryPoints(Range.START_TO_START,a)!==0)continue}else{if(r=li(n.textStart,o),r==null)break;Gi(o,r.startContainer,r.startOffset)}if(n.textEnd){let s=t.createRange();s.setStart(r.endContainer,r.endOffset),s.setEnd(o.endContainer,o.endOffset);let a=!1;for(;!s.collapsed&&i.length<2;){let l=li(n.textEnd,s);if(l==null)break;if(Gi(s,l.startContainer,l.startOffset),r.setEnd(l.endContainer,l.endOffset),n.suffix){let h=Gr(n.suffix,r,o,t);if(h===Vt.NO_SUFFIX_MATCH)break;if(h===Vt.SUFFIX_MATCH){a=!0,i.push(r.cloneRange());continue}else if(h===Vt.MISPLACED_SUFFIX)continue}else a=!0,i.push(r.cloneRange())}if(!a)break}else if(n.suffix){let s=Gr(n.suffix,r,o,t);if(s===Vt.NO_SUFFIX_MATCH)break;if(s===Vt.SUFFIX_MATCH){i.push(r.cloneRange()),Gi(o,o.startContainer,o.startOffset);continue}else if(s===Vt.MISPLACED_SUFFIX)continue}else i.push(r.cloneRange())}return i},Vt={NO_SUFFIX_MATCH:0,SUFFIX_MATCH:1,MISPLACED_SUFFIX:2},Gr=(n,t,e,i)=>{let o=i.createRange();o.setStart(t.endContainer,t.endOffset),o.setEnd(e.endContainer,e.endOffset),$r(o);let r=li(n,o);return r==null?Vt.NO_SUFFIX_MATCH:r.compareBoundaryPoints(Range.START_TO_START,o)!==0?Vt.MISPLACED_SUFFIX:Vt.SUFFIX_MATCH},Gi=(n,t,e)=>{try{n.setStart(t,e+1)}catch{n.setStartAfter(t)}},$r=n=>{let t=xh(n),e=t.nextNode();for(;!n.collapsed&&e!=null;){if(e!==n.startContainer&&n.setStart(e,0),e.textContent.length>n.startOffset&&!e.textContent[n.startOffset].match(/\s/))return;try{n.setStart(e,n.startOffset+1)}catch{e=t.nextNode(),e==null?n.collapse():n.setStart(e,0)}}},xh=n=>{var t;return((t=n.commonAncestorContainer.ownerDocument)!=null?t:n.commonAncestorContainer).createTreeWalker(n.commonAncestorContainer,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,{acceptNode:e=>kh(e,n)})},Ph=n=>{if(n.hidden==="until-found")return!0;let t=n.attributes;return!!(t&&t.hidden&&t.hidden.value==="until-found")},Xr=n=>{var o;let t=n;for(;t!=null&&t.nodeType!==Node.ELEMENT_NODE;)t=t.parentNode;let e=t,i=(o=e==null?void 0:e.ownerDocument)==null?void 0:o.defaultView;if(e!=null&&i!=null){if(Ph(e))return!0;let r=i.getComputedStyle(e);if(r.visibility==="hidden"||r.display==="none"||parseInt(r.height,10)===0&&r.overflowY!="visible"||parseInt(r.width,10)===0&&r.overflowX!="visible"||parseInt(r.opacity,10)===0)return!1}return!0},Fh=(n,t)=>t!=null&&!t.intersectsNode(n)?NodeFilter.FILTER_REJECT:Xr(n)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT,kh=(n,t)=>t!=null&&!t.intersectsNode(n)||!Xr(n)?NodeFilter.FILTER_REJECT:n.nodeType===Node.TEXT_NODE?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP,Th=(n,t)=>{let e=[],i=[],o=Array.from(Oh(n,r=>Fh(r,t)));for(let r of o)r.nodeType===Node.TEXT_NODE?i.push(r):r.nodeType===Node.ELEMENT_NODE&&Eh.includes(r.tagName.toUpperCase())&&i.length>0&&(e.push(i),i=[]);return i.length>0&&e.push(i),e},zh=(n,t,e)=>{let i="";return n.length===1?i=n[0].textContent.substring(t,e):i=n[0].textContent.substring(t)+n.slice(1,-1).reduce((o,r)=>o+r.textContent,"")+n.slice(-1)[0].textContent.substring(0,e),i.replace(/[\t\n\r ]+/g," ")};function*Oh(n,t){var o;let e=((o=n.ownerDocument)!=null?o:n).createTreeWalker(n,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:t}),i=new Set;for(;Nh(e,i)!==null;)yield e.currentNode}var li=(n,t)=>{var o;let e=Th(t.commonAncestorContainer,t),i=Mh((o=t.commonAncestorContainer.ownerDocument)!=null?o:void 0);for(let r of e){let s=Lh(n,t,r,i);if(s!==void 0)return s}},Lh=(n,t,e,i)=>{if(!n||!t||!(e||[]).length)return;let o=e[0]===t.startContainer?t.startOffset:0,r=me(zh(e,o,void 0)),s=me(n),a=0,l,h;for(;a<r.length;){let c=r.indexOf(s,a);if(c===-1)return;if(Ah(r,c,s.length,i)){let d=me(e[0].data.slice(0,o)).length;l=Vr(d+c,e,!1),h=Vr(d+c+s.length,e,!0)}if(l!=null&&h!=null){let d=new Range;if(d.setStart(l.node,l.offset),d.setEnd(h.node,h.offset),t.compareBoundaryPoints(Range.START_TO_START,d)<=0&&t.compareBoundaryPoints(Range.END_TO_END,d)>=0)return d}a=c+1}},Vr=(n,t,e)=>{let i=0,o;for(let r=0;r<t.length;r++){let s=t[r];o||(o=me(s.data));let a=i+o.length;if(e&&(a+=1),a>n){let l=n-i,h=Math.min(n-i,s.data.length),c=e?o.substring(0,l):o.substring(l),d=me(e?s.data.substring(0,h):s.data.substring(h)),u=(e?-1:1)*(c.length>d.length?-1:1);for(;h>=0&&h<=s.data.length;){if(d.length===c.length)return{node:s,offset:h};h+=u,d=me(e?s.data.substring(0,h):s.data.substring(h))}}if(i+=o.length,r+1<t.length){let l=me(t[r+1].data);o.slice(-1)===" "&&l.slice(0,1)===" "&&(i-=1),o=l}}},Ah=(n,t,e,i)=>{if(t<0||t>=n.length||e<=0||t+e>n.length)return!1;if(i){let o=i.segment(n),r=o.containing(t);if(!r||r.isWordLike&&r.index!=t)return!1;let s=t+e,a=o.containing(s);if(a&&a.isWordLike&&a.index!=s)return!1}else if(n[t].match(ji)&&(++t,--e,!e)||n[t+e-1].match(ji)&&(--e,!e)||t!==0&&!n[t-1].match(ji)||t+e!==n.length&&!n[t+e].match(ji))return!1;return!0},me=n=>(n||"").normalize("NFKD").replace(/\s+/g," ").replace(/[\u0300-\u036f]/g,"").toLowerCase(),Mh=n=>{var t,e,i;if(Intl.Segmenter){let o=((t=n==null?void 0:n.documentElement)==null?void 0:t.lang)||((i=(e=n==null?void 0:n.defaultView)==null?void 0:e.navigator)==null?void 0:i.language)||void 0;return new Intl.Segmenter(o,{granularity:"word"})}},Nh=(n,t)=>{if(!t.has(n.currentNode)){let o=n.firstChild();if(o!==null)return o}let e=n.nextSibling();if(e!==null)return e;let i=n.parentNode();return i!==null&&t.add(i),i};function $t(n){var t;return(t=n.otherLocations)==null?void 0:t.get("cssSelector")}function Qo(n){var t;return Ni.deserialize((t=n.otherLocations)==null?void 0:t.get("domRange"))}function tn(n){var t;return(t=n.fragments)==null?void 0:t.map(e=>Jo(e)).find(e=>e)}function en(n){var t;return new Map((t=n.fragments)==null?void 0:t.map(e=>e.startsWith("#")?e.slice(1):e).join("&").split("&").filter(e=>!e.startsWith("#")).map(e=>e.split("=")).filter(e=>e.length===2).map(e=>[e[0].trim().toLowerCase(),e[1].trim()]))}function hi(n){var i;if(!((i=n.fragments)!=null&&i.length))return;let t=n.fragments.find(o=>o.length&&!o.includes("="));if(!t){let o=en(n);o.has("id")?t=o.get("id"):o.has("name")&&(t=o.get("name"))}let e=t!=null&&t.startsWith("#")?t.slice(1):t;return e!==void 0?Gt(e):void 0}function on(n){let t=en(n).get("t");if(t)return ue(t)}p();p();var rt=class n{constructor(t){let e,i,o=t.mediaType.replace(/\s/g,"").split(";"),r=o[0].split("/");if(r.length===2){if(e=r[0].toLowerCase().trim(),i=r[1].toLowerCase().trim(),e.length===0||i.length===0)throw new Error("Invalid media type")}else throw new Error("Invalid media type");let s={};for(let u=1;u<o.length;u++){let m=o[u].split("=");if(m.length===2){let g=m[0].toLocaleLowerCase(),b=g==="charset"?m[1].toUpperCase():m[1];s[g]=b}}let a={},l=Object.keys(s);l.sort((u,m)=>u.localeCompare(m)),l.forEach(u=>a[u]=s[u]);let h="";for(let u in a){let m=a[u];h+=`;${u}=${m}`}let c=`${e}/${i}${h}`,d=a.encoding;this.string=c,this.type=e,this.subtype=i,this.parameters=a,this.encoding=d,this.name=t.name,this.fileExtension=t.fileExtension}static parse(t){return new n(t)}get structuredSyntaxSuffix(){let t=this.subtype.split("+");return t.length>1?`+${t[t.length-1]}`:void 0}get essence(){return`${this.type}/${this.subtype}`}get charset(){return this.parameters.charset}contains(t){let e=typeof t=="string"?n.parse({mediaType:t}):t;if(!((this.type==="*"||this.type===e.type)&&(this.subtype==="*"||this.subtype===e.subtype)))return!1;let i=new Set(Object.entries(this.parameters).map(([r,s])=>`${r}=${s}`)),o=new Set(Object.entries(e.parameters).map(([r,s])=>`${r}=${s}`));for(let r of Array.from(i.values()))if(!o.has(r))return!1;return!0}matches(t){let e=typeof t=="string"?n.parse({mediaType:t}):t;return this.contains(e)||e.contains(this)}matchesAny(...t){for(let e of t)if(this.matches(e))return!0;return!1}equals(t){return this.string===t.string}get isZIP(){return this.matchesAny(n.ZIP,n.LCP_PROTECTED_AUDIOBOOK,n.LCP_PROTECTED_PDF)||this.structuredSyntaxSuffix==="+zip"}get isJSON(){return this.matchesAny(n.JSON)||this.structuredSyntaxSuffix==="+json"}get isOPDS(){return this.matchesAny(n.OPDS1,n.OPDS1_ENTRY,n.OPDS2,n.OPDS2_PUBLICATION,n.OPDS_AUTHENTICATION)||this.structuredSyntaxSuffix==="+json"}get isHTML(){return this.matchesAny(n.HTML,n.XHTML)}get isBitmap(){return this.matchesAny(n.AVIF,n.BMP,n.GIF,n.JPEG,n.PNG,n.TIFF,n.WEBP)}get isAudio(){return this.type==="audio"}get isVideo(){return this.type==="video"}get isRWPM(){return this.matchesAny(n.READIUM_AUDIOBOOK_MANIFEST,n.DIVINA_MANIFEST,n.READIUM_WEBPUB_MANIFEST)}get isPublication(){return this.matchesAny(n.READIUM_AUDIOBOOK,n.READIUM_AUDIOBOOK_MANIFEST,n.CBZ,n.DIVINA,n.DIVINA_MANIFEST,n.EPUB,n.LCP_PROTECTED_AUDIOBOOK,n.LCP_PROTECTED_PDF,n.LPF,n.PDF,n.W3C_WPUB_MANIFEST,n.READIUM_WEBPUB,n.READIUM_WEBPUB_MANIFEST,n.ZAB)}static get AAC(){return n.parse({mediaType:"audio/aac",fileExtension:"aac"})}static get ACSM(){return n.parse({mediaType:"application/vnd.adobe.adept+xml",name:"Adobe Content Server Message",fileExtension:"acsm"})}static get AIFF(){return n.parse({mediaType:"audio/aiff",fileExtension:"aiff"})}static get AVI(){return n.parse({mediaType:"video/x-msvideo",fileExtension:"avi"})}static get AVIF(){return n.parse({mediaType:"image/avif",fileExtension:"avif"})}static get BINARY(){return n.parse({mediaType:"application/octet-stream"})}static get BMP(){return n.parse({mediaType:"image/bmp",fileExtension:"bmp"})}static get CBZ(){return n.parse({mediaType:"application/vnd.comicbook+zip",name:"Comic Book Archive",fileExtension:"cbz"})}static get CSS(){return n.parse({mediaType:"text/css",fileExtension:"css"})}static get DIVINA(){return n.parse({mediaType:"application/divina+zip",name:"Digital Visual Narratives",fileExtension:"divina"})}static get DIVINA_MANIFEST(){return n.parse({mediaType:"application/divina+json",name:"Digital Visual Narratives",fileExtension:"json"})}static get EPUB(){return n.parse({mediaType:"application/epub+zip",name:"EPUB",fileExtension:"epub"})}static get GIF(){return n.parse({mediaType:"image/gif",fileExtension:"gif"})}static get GZ(){return n.parse({mediaType:"application/gzip",fileExtension:"gz"})}static get HTML(){return n.parse({mediaType:"text/html",fileExtension:"html"})}static get JAVASCRIPT(){return n.parse({mediaType:"text/javascript",fileExtension:"js"})}static get JPEG(){return n.parse({mediaType:"image/jpeg",fileExtension:"jpeg"})}static get JSON(){return n.parse({mediaType:"application/json"})}static get LCP_LICENSE_DOCUMENT(){return n.parse({mediaType:"application/vnd.readium.lcp.license.v1.0+json",name:"LCP License",fileExtension:"lcpl"})}static get LCP_PROTECTED_AUDIOBOOK(){return n.parse({mediaType:"application/audiobook+lcp",name:"LCP Protected Audiobook",fileExtension:"lcpa"})}static get LCP_PROTECTED_PDF(){return n.parse({mediaType:"application/pdf+lcp",name:"LCP Protected PDF",fileExtension:"lcpdf"})}static get LCP_STATUS_DOCUMENT(){return n.parse({mediaType:"application/vnd.readium.license.status.v1.0+json"})}static get LPF(){return n.parse({mediaType:"application/lpf+zip",fileExtension:"lpf"})}static get MP3(){return n.parse({mediaType:"audio/mpeg",fileExtension:"mp3"})}static get MPEG(){return n.parse({mediaType:"video/mpeg",fileExtension:"mpeg"})}static get NCX(){return n.parse({mediaType:"application/x-dtbncx+xml",fileExtension:"ncx"})}static get OGG(){return n.parse({mediaType:"audio/ogg",fileExtension:"oga"})}static get OGV(){return n.parse({mediaType:"video/ogg",fileExtension:"ogv"})}static get OPDS1(){return n.parse({mediaType:"application/atom+xml;profile=opds-catalog"})}static get OPDS1_ENTRY(){return n.parse({mediaType:"application/atom+xml;type=entry;profile=opds-catalog"})}static get OPDS2(){return n.parse({mediaType:"application/opds+json"})}static get OPDS2_PUBLICATION(){return n.parse({mediaType:"application/opds-publication+json"})}static get OPDS_AUTHENTICATION(){return n.parse({mediaType:"application/opds-authentication+json"})}static get OPUS(){return n.parse({mediaType:"audio/opus",fileExtension:"opus"})}static get OTF(){return n.parse({mediaType:"font/otf",fileExtension:"otf"})}static get PDF(){return n.parse({mediaType:"application/pdf",name:"PDF",fileExtension:"pdf"})}static get PNG(){return n.parse({mediaType:"image/png",fileExtension:"png"})}static get READIUM_AUDIOBOOK(){return n.parse({mediaType:"application/audiobook+zip",name:"Readium Audiobook",fileExtension:"audiobook"})}static get READIUM_AUDIOBOOK_MANIFEST(){return n.parse({mediaType:"application/audiobook+json",name:"Readium Audiobook",fileExtension:"json"})}static get READIUM_CONTENT_DOCUMENT(){return n.parse({mediaType:"application/vnd.readium.content+json",name:"Readium Content Document",fileExtension:"json"})}static get READIUM_GUIDED_NAVIGATION_DOCUMENT(){return n.parse({mediaType:"application/guided-navigation+json",name:"Readium Guided Navigation Document",fileExtension:"json"})}static get READIUM_POSITION_LIST(){return n.parse({mediaType:"application/vnd.readium.position-list+json",name:"Readium Position List",fileExtension:"json"})}static get READIUM_WEBPUB(){return n.parse({mediaType:"application/webpub+zip",name:"Readium Web Publication",fileExtension:"webpub"})}static get READIUM_WEBPUB_MANIFEST(){return n.parse({mediaType:"application/webpub+json",name:"Readium Web Publication",fileExtension:"json"})}static get SMIL(){return n.parse({mediaType:"application/smil+xml",fileExtension:"smil"})}static get SVG(){return n.parse({mediaType:"image/svg+xml",fileExtension:"svg"})}static get TEXT(){return n.parse({mediaType:"text/plain",fileExtension:"txt"})}static get TIFF(){return n.parse({mediaType:"image/tiff",fileExtension:"tiff"})}static get TTF(){return n.parse({mediaType:"font/ttf",fileExtension:"ttf"})}static get W3C_WPUB_MANIFEST(){return n.parse({mediaType:"application/x.readium.w3c.wpub+json",name:"Web Publication",fileExtension:"json"})}static get WAV(){return n.parse({mediaType:"audio/wav",fileExtension:"wav"})}static get WEBM_AUDIO(){return n.parse({mediaType:"audio/webm",fileExtension:"webm"})}static get WEBM_VIDEO(){return n.parse({mediaType:"video/webm",fileExtension:"webm"})}static get WEBP(){return n.parse({mediaType:"image/webp",fileExtension:"webp"})}static get WOFF(){return n.parse({mediaType:"font/woff",fileExtension:"woff"})}static get WOFF2(){return n.parse({mediaType:"font/woff2",fileExtension:"woff2"})}static get XHTML(){return n.parse({mediaType:"application/xhtml+xml",fileExtension:"xhtml"})}static get XML(){return n.parse({mediaType:"application/xml",fileExtension:"xml"})}static get ZAB(){return n.parse({mediaType:"application/x.readium.zab+zip",name:"Zipped Audio Book",fileExtension:"zab"})}static get ZIP(){return n.parse({mediaType:"application/zip",fileExtension:"zip"})}};p();var st=(n=>(n.left="left",n.right="right",n.center="center",n))(st||{}),Me=class n{constructor(t){this.otherProperties=t}get page(){return this.otherProperties.page}static deserialize(t){if(t)return new n(t)}serialize(){return this.otherProperties}add(t){let e=Object.assign({},this.otherProperties);for(let i in t)e[i]=t[i];return new n(e)}};p();var pe=class{constructor(t){this.uri=t,this.parameters=this.getParameters(t)}getParameters(t){let e=/\{\??([^}]+)\}/g,i=t.match(e);return i?new Set(i.join(",").replace(e,"$1").split(",").map(o=>o.trim())):new Set}expand(t){let e=o=>o.split(",").map(r=>{let s=t[r];return s?encodeURIComponent(s):""}).join(","),i=o=>"?"+o.split(",").map(r=>{let s=r.split("=")[0],a=t[s];return a?`${s}=${encodeURIComponent(a)}`:""}).join("&");return this.uri.replace(/\{(\??)([^}]+)\}/g,(...o)=>o[1]?i(o[2]):e(o[2]))}};p();var ct=class n{constructor(t){this.fragments=t.fragments?t.fragments:new Array,this.progression=t.progression,this.totalProgression=t.totalProgression,this.position=t.position,this.otherLocations=t.otherLocations}static deserialize(t){var a,l;if(!t)return;let e=he(t.progression),i=he(t.totalProgression),o=he(t.position),r=new Map,s=new Set(["fragment","fragments","progression","totalProgression","position","otherLocations"]);return Object.entries(t).forEach(([h,c])=>{s.has(h)||r.set(h,c)}),(l=(a=t.otherLocations)==null?void 0:a.forEach)==null||l.call(a,(h,c)=>r.set(c,h)),new n({fragments:tt(t.fragments||t.fragment),progression:e!==void 0&&e>=0&&e<=1?e:void 0,totalProgression:i!==void 0&&i>=0&&i<=1?i:void 0,position:o!==void 0&&o>0?o:void 0,otherLocations:r.size===0?void 0:r})}serialize(){let t={};return this.fragments&&(t.fragments=this.fragments),this.progression!==void 0&&(t.progression=this.progression),this.totalProgression!==void 0&&(t.totalProgression=this.totalProgression),this.position!==void 0&&(t.position=this.position),this.otherLocations&&this.otherLocations.forEach((e,i)=>t[i]=e),t}},Ct=class n{constructor(t){this.after=t.after,this.before=t.before,this.highlight=t.highlight}static deserialize(t){if(t)return new n({after:t.after,before:t.before,highlight:t.highlight})}serialize(){let t={};return this.after!==void 0&&(t.after=this.after),this.before!==void 0&&(t.before=this.before),this.highlight!==void 0&&(t.highlight=this.highlight),t}},G=class n{constructor(t){var s;let e=t.href.indexOf("#"),i=e>=0?t.href.slice(e+1):void 0;this.href=e>=0?t.href.slice(0,e):t.href,this.type=t.type,this.title=t.title;let o=(s=t.locations)==null?void 0:s.fragments,r=i&&(!o||o.length===0);this.locations=t.locations?r?new ct({...t.locations,fragments:[i]}):t.locations:i?new ct({fragments:[i]}):new ct({}),this.text=t.text}static deserialize(t){if(t&&t.href&&t.type)return new n({href:t.href,type:t.type,title:t.title,locations:ct.deserialize(t.locations),text:Ct.deserialize(t.text)})}serialize(){let t={href:this.href,type:this.type};return this.title!==void 0&&(t.title=this.title),this.locations&&(t.locations=this.locations.serialize()),this.text&&(t.text=this.text.serialize()),t}copyWithLocations(t){return new n({href:this.href,type:this.type,title:this.title,text:this.text,locations:new ct({...this.locations,...t})})}};var at=class n{constructor(t){this.href=t.href,this.templated=t.templated,this.type=t.type,this.title=t.title,this.rels=t.rels,this.properties=t.properties,this.height=t.height,this.width=t.width,this.size=t.size,this.duration=t.duration,this.bitrate=t.bitrate,this.languages=t.languages,this.alternates=t.alternates,this.children=t.children}static deserialize(t){if(!(!t||typeof t.href!="string"))return new n({href:t.href,templated:t.templated,type:t.type,title:t.title,rels:t.rel?Array.isArray(t.rel)?new Set(t.rel):new Set([t.rel]):void 0,properties:Me.deserialize(t.properties),height:wt(t.height),width:wt(t.width),size:wt(t.size),duration:wt(t.duration),bitrate:wt(t.bitrate),languages:tt(t.language),alternates:it.deserialize(t.alternate),children:it.deserialize(t.children)})}serialize(){let t={href:this.href};return this.templated!==void 0&&(t.templated=this.templated),this.type!==void 0&&(t.type=this.type),this.title!==void 0&&(t.title=this.title),this.rels&&(t.rel=ce(this.rels)),this.properties&&(t.properties=this.properties.serialize()),this.height!==void 0&&(t.height=this.height),this.width!==void 0&&(t.width=this.width),this.size!==void 0&&(t.size=this.size),this.duration!==void 0&&(t.duration=this.duration),this.bitrate!==void 0&&(t.bitrate=this.bitrate),this.languages&&(t.language=this.languages),this.alternates&&(t.alternate=this.alternates.serialize()),this.children&&(t.children=this.children.serialize()),t}get mediaType(){return this.type!==void 0?rt.parse({mediaType:this.type}):rt.BINARY}toURL(t){let e=this.href.replace(/^(\/)/,"");if(e.length===0)return;let i=t||"/";return i.startsWith("/")&&(i="file://"+i),new URL(e,i).href.replace(/^(file:\/\/)/,"")}get templateParameters(){return this.templated?new pe(this.href).parameters:new Set}expandTemplate(t){return new n({href:new pe(this.href).expand(t),templated:!1})}addProperties(t){var i;let e=n.deserialize(this.serialize());return e.properties=e.properties?(i=e.properties)==null?void 0:i.add(t):new Me(t),e}get locator(){var t;return new G({href:this.href,type:(t=this.type)!=null?t:"",title:this.title})}},it=class n{constructor(t){this.items=t}static deserialize(t){if(t&&Array.isArray(t))return new n(t.map(e=>at.deserialize(e)).filter(e=>e!==void 0))}serialize(){return this.items.map(t=>t.serialize())}findWithRel(t){let e=i=>i.rels&&i.rels.has(t);return this.items.find(e)}filterByRel(t){let e=i=>i.rels&&i.rels.has(t);return this.items.filter(e)}findWithHref(t){let e=i=>i.href===t;return this.items.find(e)}findIndexWithHref(t){let e=i=>i.href===t;return this.items.findIndex(e)}findWithMediaType(t){let e=i=>i.mediaType.matches(t);return this.items.find(e)}filterByMediaType(t){let e=i=>i.mediaType.matches(t);return this.items.filter(e)}filterByMediaTypes(t){let e=i=>{for(let o of t)if(i.mediaType.matches(o))return!0;return!1};return this.items.filter(e)}everyIsAudio(){let t=e=>e.mediaType.isAudio;return this.items.length>0&&this.items.every(t)}everyIsBitmap(){let t=e=>e.mediaType.isBitmap;return this.items.length>0&&this.items.every(t)}everyIsHTML(){let t=e=>e.mediaType.isHTML;return this.items.length>0&&this.items.every(t)}everyIsVideo(){let t=e=>e.mediaType.isVideo;return this.items.length>0&&this.items.every(t)}everyMatchesMediaType(t){return Array.isArray(t)?this.items.length>0&&this.items.every(e=>{for(let i of t)return e.mediaType.matches(i);return!1}):this.items.length>0&&this.items.every(e=>e.mediaType.matches(t))}filterLinksHasType(){return this.items.filter(t=>t.type)}};p();p();p();var St=(n=>(n.EPUB="https://readium.org/webpub-manifest/profiles/epub",n.AUDIOBOOK="https://readium.org/webpub-manifest/profiles/audiobook",n.DIVINA="https://readium.org/webpub-manifest/profiles/divina",n.PDF="https://readium.org/webpub-manifest/profiles/pdf",n))(St||{});var Ne=class n{constructor(t,e,i=[],o=[],r=void 0){this._trimmedLinkMap=new Map,this._allItems=t,this.linkMap=e,this._conformsTo=i,this.tocLinks=o,this._tocDepth=r}static build(t,e={}){var h,c,d,u,m;let i=(c=(h=t.toc)==null?void 0:h.items)!=null?c:[],o=t.readingOrder.items,{depth:r}=e,s=(u=(d=t.metadata)==null?void 0:d.conformsTo)!=null?u:[],a=new Map,l=[];for(let g=0;g<o.length;g++){let b=o[g],S=n.bareHref(b.href),y=(m=b.title)!=null?m:n.findTitleInToc(i,S,r),f=n.collectChildrenFromToc(i,S,r,1,a),w={title:y,references:[b.href],children:f.length>0?f:void 0};a.set(w,b),l.push(w)}return new n(l,a,s,i,r)}augment(t){for(let e of this.flatAll){let i=this.linkFor(e);if(!i)continue;let o=t(e,i);o.position!==void 0&&(e.position=o.position),o.scroll!==void 0&&(e.scroll=o.scroll),o.role!==void 0&&(e.role=o.role)}}get depth(){return this._depth}set depth(t){this._depth!==t&&(this._depth=t,this._tocDepth=t,this._items=void 0,this._flat=void 0,this._toc=void 0)}get items(){return this._items||(this._depth!==void 0?(this._trimmedLinkMap=new Map,this._items=n.trimToDepth(this._allItems,this._depth,this.linkMap,this._trimmedLinkMap)):this._items=this._allItems),this._items}locate(t){var s;let e=t.href.split("#")[0],i=on(t.locations),o=hi(t.locations),r=t.locations.progression;if(i!==void 0){let a=-1/0,l;for(let h of this.flat){if(!this.itemMatchesHref(h,e))continue;let c=this.itemStartTime(h,e);c!==void 0&&c<=i&&c>a&&(a=c,l=h)}if(l)return l}if(o){let a=this.flat.find(l=>this.itemMatchesHref(l,e)?l.references.some(h=>{let c=h.split("#")[1];return c!==void 0&&Gt(c)===o}):!1);if(a)return a}if(r!==void 0){let a=-1/0,l;for(let c of this.flat){if(!this.itemMatchesHref(c,e))continue;let d=this.itemScrollPosition(c);d!==void 0&&d<=r&&d>a&&(a=d,l=c)}if(l)return l;let h=this.items.find(c=>this.itemMatchesHref(c,e));if((s=h==null?void 0:h.children)!=null&&s.length&&!h.children.some(c=>c.scroll!==void 0)){let c=Math.min(Math.floor(r*h.children.length),h.children.length-1);return h.children[c]}}return this.flat.find(a=>this.itemMatchesHref(a,e))}navigableFrom(t){let e=this.flat.indexOf(t);return{previous:e>0?this.flat[e-1]:void 0,next:e>=0&&e<this.flat.length-1?this.flat[e+1]:void 0}}segmentsForHref(t){var o;let e=t.split("#")[0],i=this.items.find(r=>this.itemMatchesHref(r,e));return i?(o=i.children)!=null&&o.length?i.children:[i]:[]}ancestors(t){var e;return(e=this.ancestorPath(this.items,t))!=null?e:[]}linkFor(t){var e;return(e=this.linkMap.get(t))!=null?e:this._trimmedLinkMap.get(t)}get contextualizedToc(){return this._toc||(this._toc=this.tocLinks.length>0?this.buildTocEntries(this.tocLinks,this._tocDepth,1):this._allItems.map(t=>this.entryFor(this.linkFor(t),t))),this._toc}tocEntryFor(t){let e=this.linkFor(t);if(!e)return;let i=this.findTocEntryByLink(this.contextualizedToc,e);return i||this.nearestTocEntryForResource(e.href,t)||this.previousResolvedTocEntry(e)}get flat(){return this._flat||(this._flat=this.flattenItems(this.items)),this._flat}get flatAll(){return this.flattenItems(this._allItems)}static findTitleInToc(t,e,i){let{atStart:o,fragments:r}=n.collectTocCandidates(t,e,i,1);if(o.length>0)return o[0].title;if(r.length===1)return r[0].title}static collectChildrenFromToc(t,e,i,o,r){var a,l;if(i!==void 0&&o>i)return[];let s=[];for(let h of t){let c=n.bareHref(h.href),d=h.href.startsWith("#");if((c===e||d&&c==="")&&h.title&&!n.isStartOfResource(h.href)){let u=c===""?e+h.href:h.href,m={title:h.title,references:[u]};r.set(m,h),s.push(m)}(l=(a=h.children)==null?void 0:a.items)!=null&&l.length&&s.push(...n.collectChildrenFromToc(h.children.items,e,i,o+1,r))}return s}static collectTocCandidates(t,e,i,o){var a,l;if(i!==void 0&&o>i)return{atStart:[],fragments:[]};let r=[],s=[];for(let h of t){let c=n.bareHref(h.href),d=h.href.startsWith("#");if((c===e||d&&c==="")&&h.title&&(n.isStartOfResource(h.href)?r.push(h):s.push(h)),(l=(a=h.children)==null?void 0:a.items)==null?void 0:l.length){let u=n.collectTocCandidates(h.children.items,e,i,o+1);r.push(...u.atStart),s.push(...u.fragments)}}return{atStart:r,fragments:s}}static isStartOfResource(t){let e=t.split("#")[1];if(!e)return!0;let i=e.match(/(?:^|&)t=([^&]+)/);return i!==null&&Ir(i[1])}get linkToItem(){if(!this._linkToItem){this._linkToItem=new Map;for(let[t,e]of this.linkMap)this._linkToItem.set(e,t)}return this._linkToItem}buildTocEntries(t,e,i){return e!==void 0&&i>e?[]:t.map(o=>{var a,l,h;let r=(a=this.linkToItem.get(o))!=null?a:this.resourceStartItem(o.href),s=(h=(l=o.children)==null?void 0:l.items)!=null&&h.length?this.buildTocEntries(o.children.items,e,i+1):[];return{...this.entryFor(o,r),children:s.length>0?s:void 0}})}tocLinksFlat(t,e,i){var r,s;if(e!==void 0&&i>e)return[];let o=[];for(let a of t)o.push(a),(s=(r=a.children)==null?void 0:r.items)!=null&&s.length&&o.push(...this.tocLinksFlat(a.children.items,e,i+1));return o}entryFor(t,e){let i=this._conformsTo.includes(St.AUDIOBOOK);return{link:t,position:!i&&(e==null?void 0:e.position)!==void 0?String(e.position):void 0,timestamp:i&&(e==null?void 0:e.position)!==void 0?Hr(e.position):void 0}}resourceStartItem(t){let e=n.bareHref(t);return this._allItems.find(i=>this.itemMatchesHref(i,e))}findTocEntryByLink(t,e){for(let i of t){if(i.link===e)return i;if(i.children){let o=this.findTocEntryByLink(i.children,e);if(o)return o}}}nearestTocEntryForResource(t,e){var c,d,u,m,g,b;let i=n.bareHref(t),o=this.tocLinksFlat(this.tocLinks,this._tocDepth,1).filter(S=>n.bareHref(S.href)===i).map(S=>{var y;return{link:S,item:(y=this.linkToItem.get(S))!=null?y:this.resourceStartItem(S.href)}});if(o.length===0)return;let r=this._conformsTo.includes(St.AUDIOBOOK),s=r?(c=e.position)!=null?c:0:(d=e.scroll)!=null?d:0,a,l=-1/0;for(let S of o){let y=r?(m=(u=S.item)==null?void 0:u.position)!=null?m:0:(b=(g=S.item)==null?void 0:g.scroll)!=null?b:0;y<=s&&y>l&&(l=y,a=S)}let h=a!=null?a:o[0];return this.findTocEntryByLink(this.contextualizedToc,h.link)}previousResolvedTocEntry(t){var i;let e=this._allItems.findIndex(o=>this.linkFor(o)===t);if(e!==-1)for(let o=e-1;o>=0;o--){let r=this.linkFor(this._allItems[o]);if(!r)continue;let s=n.bareHref(r.href),{atStart:a,fragments:l}=n.collectTocCandidates(this.tocLinks,s,this._tocDepth,1),h=a.filter(m=>n.bareHref(m.href)===s),c=l.filter(m=>n.bareHref(m.href)===s),d=(i=h[0])!=null?i:c.length>0?c[c.length-1]:void 0;if(!d)continue;let u=this.findTocEntryByLink(this.contextualizedToc,d);if(u)return u}}static trimToDepth(t,e,i,o){return t.map(r=>{var l;let s={...r,children:e>1&&((l=r.children)!=null&&l.length)?n.trimToDepth(r.children,e-1,i,o):void 0},a=i.get(r);return a&&o.set(s,a),s})}flattenItems(t){let e=[];for(let i of t)e.push(i),i.children&&e.push(...this.flattenItems(i.children));return e}itemStartTime(t,e){for(let i of t.references){let o=i.indexOf("#"),r=o>=0?i.slice(0,o):i,s=o>=0?i.slice(o+1):void 0;if((r||e)!==e)continue;if(!s)return 0;let a=s.match(/(?:^|&)t=([^&]+)/);return a?ue(a[1]):void 0}}itemMatchesHref(t,e){return t.references.some(i=>{let o=i.split("#")[0];return o===e||o===""})}ancestorPath(t,e){for(let i of t){if(i===e)return[];if(i.children){let o=this.ancestorPath(i.children,e);if(o!==null)return[i,...o]}}return null}itemScrollPosition(t){return t.scroll}static bareHref(t){return t.split("#")[0]}};function Kr(n,t){return Ne.build(n,t)}p();function Yr(n,t){let e=Ne.build(n,t),i=n.readingOrder.items;if(!(i.length<=1||i.every(s=>s.duration!==void 0)))return e;let o=0,r=new Map(i.map(s=>{var l;let a=o;return o+=(l=s.duration)!=null?l:0,[s.href,a]}));return e.augment((s,a)=>{var b;let l=a.href,h=l.indexOf("#"),c=h>=0?l.slice(0,h):l,d=h>=0?l.slice(h+1):void 0,u=(b=r.get(c))!=null?b:0,m=d==null?void 0:d.match(/(?:^|&)t=([^&]+)/),g=m?ue(m[1]):void 0;return{position:u+(g!=null?g:0)}}),e}p();function qr(n,t){var e,i,o;return(o=(i=(e=n.metadata)==null?void 0:e.conformsTo)==null?void 0:i.includes(St.AUDIOBOOK))!=null&&o?Yr(n,t):Kr(n,t)}p();var ge=class n{constructor(t){this.value=t.value,this.scheme=t.scheme}static deserialize(t){if(t){if(typeof t=="string")return new n({value:t});if(typeof t=="object"&&t.value)return new n({value:t.value,scheme:t.scheme})}}serialize(){return this.scheme?{value:this.value,scheme:this.scheme}:this.value}};p();p();p();var nn=class De{constructor(t){this.translations=typeof t=="string"?{[De.UNDEFINED_LANGUAGE]:t}:t}static deserialize(t){if(t&&(typeof t=="string"||t.constructor===Object))return new De(t)}serialize(){return this.translations}getTranslation(t){return this.translations[t||De.UNDEFINED_LANGUAGE]||this.translations[De.UNDEFINED_LANGUAGE]||this.translations[De.LANGUAGE_EN]||(Object.values(this.translations).length===0?"":Object.values(this.translations)[0])}};nn.UNDEFINED_LANGUAGE="und",nn.LANGUAGE_EN="en";var xt=nn;var rn=class n{constructor(t){this.name=t.name,this.sortAs=t.sortAs,this.identifier=t.identifier,this.altIdentifiers=t.altIdentifiers,this.roles=t.roles,this.links=t.links,this.position=t.position}static deserialize(t){if(t)return typeof t=="string"?new n({name:xt.deserialize(t)}):t.name?new n({name:xt.deserialize(t.name),sortAs:xt.deserialize(t.sortAs),identifier:t.identifier,altIdentifiers:t.altIdentifier?Array.isArray(t.altIdentifier)?new Set(t.altIdentifier.map(e=>ge.deserialize(e)).filter(e=>e!==void 0)):new Set([ge.deserialize(t.altIdentifier)].filter(e=>e!==void 0)):void 0,roles:t.role?new Set(tt(t.role)):void 0,links:it.deserialize(t.links),position:he(t.position)}):void 0}serialize(){let t={name:this.name.serialize()};return this.sortAs!==void 0&&(t.sortAs=this.sortAs.serialize()),this.identifier!==void 0&&(t.identifier=this.identifier),this.altIdentifiers&&(t.altIdentifier=ce(this.altIdentifiers).map(e=>e.serialize())),this.roles&&(t.role=ce(this.roles)),this.links&&(t.links=this.links.serialize()),this.position!==void 0&&(t.position=this.position),t}},nt=class n{constructor(t){this.items=t}static deserialize(t){if(!t)return;let e=Array.isArray(t)?t:[t];return new n(e.map(i=>rn.deserialize(i)).filter(i=>i!==void 0))}serialize(){return this.items.map(t=>t.serialize())}};var Ue=class n{constructor(t){this.items=t&&t.items?t.items:new Map}static deserialize(t){if(!(t&&typeof t=="object"))return;let e=new Map;return Object.entries(t).forEach(([i,o])=>{let r=nt.deserialize(o);r&&r.items.length>0&&e.set(i,r)}),new n({items:e})}serialize(){let t={};return this.items.forEach((e,i)=>t[i]=e.serialize()),t}};p();p();p();var D=(n=>(n.ltr="ltr",n.rtl="rtl",n))(D||{});p();var sn=class n{constructor(t){this.name=t.name,this.sortAs=t.sortAs,this.code=t.code,this.scheme=t.scheme,this.links=t.links}static deserialize(t){if(t)return typeof t=="string"?new n({name:xt.deserialize(t)}):t.name?new n({name:xt.deserialize(t.name),sortAs:t.sortAs?xt.deserialize(t.sortAs):void 0,code:t.code,scheme:t.scheme,links:it.deserialize(t.links)}):void 0}serialize(){let t={name:this.name.serialize()};return this.sortAs!==void 0&&(t.sortAs=this.sortAs.serialize()),this.code!==void 0&&(t.code=this.code),this.scheme!==void 0&&(t.scheme=this.scheme),this.links&&(t.links=this.links.serialize()),t}},Vi=class n{constructor(t){this.items=t}static deserialize(t){if(!t)return;let e=Array.isArray(t)?t:[t];return new n(e.map(i=>sn.deserialize(i)).filter(i=>i!==void 0))}serialize(){return this.items.map(t=>t.serialize())}};p();var Dh=(n=>(n.all="all",n.none="none",n))(Dh||{}),$i=class n{constructor(t){this.reservation=t.reservation,this.policy=t.policy}static deserialize(t){if(t)return new n({reservation:t.reservation,policy:t.policy})}serialize(){let t={};return this.reservation!==void 0&&(t.reservation=this.reservation),this.policy!==void 0&&(t.policy=this.policy),t}};var Jr=class an{constructor(t){this.title=t.title,this.typeUri=t.typeUri,this.conformsTo=t.conformsTo,this.identifier=t.identifier,this.altIdentifier=t.altIdentifier,this.subtitle=t.subtitle,this.sortAs=t.sortAs,this.artists=t.artists,this.authors=t.authors,this.colorists=t.colorists,this.contributors=t.contributors,this.editors=t.editors,this.illustrators=t.illustrators,this.inkers=t.inkers,this.letterers=t.letterers,this.narrators=t.narrators,this.pencilers=t.pencilers,this.translators=t.translators,this.languages=t.languages,this.description=t.description,this.publishers=t.publishers,this.imprints=t.imprints,this.published=t.published,this.modified=t.modified,this.subjects=t.subjects,this.belongsTo=t.belongsTo,this.belongsToCollections=t.belongsToCollections,this.belongsToSeries=t.belongsToSeries,this.belongsToCollections&&this.belongsToCollections.items.length>0&&(this.belongsTo||(this.belongsTo=new Ue),this.belongsTo.items.set("collection",this.belongsToCollections)),this.belongsToSeries&&this.belongsToSeries.items.length>0&&(this.belongsTo||(this.belongsTo=new Ue),this.belongsTo.items.set("series",this.belongsToSeries)),this.layout=t.layout,this.readingProgression=t.readingProgression,this.duration=t.duration,this.numberOfPages=t.numberOfPages,this.accessibility=t.accessibility,this.tdm=t.tdm,this.otherMetadata=t.otherMetadata}static deserialize(t){if(!(t&&t.title))return;let e=xt.deserialize(t.title),i=t["@type"],o=tt(t.conformsTo),r=t.identifier,s=ge.deserialize(t.altIdentifier),a=xt.deserialize(t.subtitle),l=xt.deserialize(t.sortAs),h=nt.deserialize(t.artist),c=nt.deserialize(t.author),d=nt.deserialize(t.colorist),u=nt.deserialize(t.contributor),m=nt.deserialize(t.editor),g=nt.deserialize(t.illustrator),b=nt.deserialize(t.inker),S=nt.deserialize(t.letterer),y=nt.deserialize(t.narrator),f=nt.deserialize(t.penciler),w=nt.deserialize(t.translator),R=tt(t.language),v=t.description,C=nt.deserialize(t.publisher),z=nt.deserialize(t.imprint),k=$o(t.published),T=$o(t.modified),O=Vi.deserialize(t.subject),x=Ue.deserialize(t.belongsTo),P=Mi.deserialize(t.accessibility),A=t.layout,U=t.readingProgression,M=wt(t.duration),N=wt(t.numberOfPages),V=$i.deserialize(t.tdm),J=Object.assign({},t);return an.mappedProperties.forEach(Q=>delete J[Q]),Object.keys(J).length===0&&(J=void 0),new an({title:e,typeUri:i,conformsTo:o,identifier:r,altIdentifier:s,subtitle:a,sortAs:l,artists:h,authors:c,colorists:d,contributors:u,editors:m,illustrators:g,inkers:b,letterers:S,narrators:y,pencilers:f,translators:w,languages:R,description:v,publishers:C,imprints:z,published:k,modified:T,subjects:O,belongsTo:x,layout:A,readingProgression:U,duration:M,numberOfPages:N,accessibility:P,tdm:V,otherMetadata:J})}serialize(){let t={title:this.title.serialize()};if(this.typeUri!==void 0&&(t["@type"]=this.typeUri),this.conformsTo&&(t.conformsTo=this.conformsTo),this.identifier!==void 0&&(t.identifier=this.identifier),this.altIdentifier&&(t.altIdentifier=this.altIdentifier.serialize()),this.subtitle&&(t.subtitle=this.subtitle.serialize()),this.sortAs&&(t.sortAs=this.sortAs.serialize()),this.editors&&(t.editor=this.editors.serialize()),this.artists&&(t.artist=this.artists.serialize()),this.authors&&(t.author=this.authors.serialize()),this.colorists&&(t.colorist=this.colorists.serialize()),this.contributors&&(t.contributor=this.contributors.serialize()),this.illustrators&&(t.illustrator=this.illustrators.serialize()),this.letterers&&(t.letterer=this.letterers.serialize()),this.narrators&&(t.narrator=this.narrators.serialize()),this.pencilers&&(t.penciler=this.pencilers.serialize()),this.translators&&(t.translator=this.translators.serialize()),this.inkers&&(t.inker=this.inkers.serialize()),this.languages&&(t.language=this.languages),this.description!==void 0&&(t.description=this.description),this.publishers&&(t.publisher=this.publishers.serialize()),this.imprints&&(t.imprint=this.imprints.serialize()),this.published!==void 0&&(t.published=this.published.toISOString()),this.modified!==void 0&&(t.modified=this.modified.toISOString()),this.subjects&&(t.subject=this.subjects.serialize()),this.belongsTo&&(t.belongsTo=this.belongsTo.serialize()),this.layout&&(t.layout=this.layout),this.readingProgression&&(t.readingProgression=this.readingProgression),this.duration!==void 0&&(t.duration=this.duration),this.numberOfPages!==void 0&&(t.numberOfPages=this.numberOfPages),this.accessibility&&(t.accessibility=this.accessibility.serialize()),this.tdm&&(t.tdm=this.tdm.serialize()),this.otherMetadata){let e=this.otherMetadata;Object.keys(e).forEach(i=>t[i]=e[i])}return t}get effectiveLayout(){if(!this.conformsTo)return null;for(let t of this.conformsTo)switch(t){case St.EPUB:return this.layout||F.reflowable;case St.DIVINA:return this.layout===F.reflowable?F.fixed:this.layout||F.fixed;case St.AUDIOBOOK:case St.PDF:return null}return null}get effectiveReadingProgression(){var e;if(this.readingProgression)return this.readingProgression;if(((e=this.languages)==null?void 0:e.length)!==1)return D.ltr;let t=this.languages[0].toLowerCase();if(t==="zh-hant"||t==="zh-tw")return D.rtl;switch(t.split("-")[0]){case"ar":return D.rtl;case"fa":return D.rtl;case"he":return D.rtl;default:return D.ltr}}};Jr.mappedProperties=["title","@type","conformsTo","identifier","altIdentifier","subtitle","sortAs","artist","author","colorist","contributor","editor","illustrator","inker","letterer","narrator","penciler","translator","language","description","publisher","imprint","published","modified","subject","belongsTo","layout","readingProgression","duration","numberOfPages","accessibility","tdm"];var Zr=Jr;p();var ci=class n{constructor(t){this.metadata=t.metadata,this.links=t.links,this.subcollections=t.subcollections}static deserialize(t){if(!t)return;let e,i,o;if(Array.isArray(t))e=it.deserialize(t);else if(typeof t=="object")e=it.deserialize(t.links),i=new Map,t.metadata&&Object.entries(t.metadata).forEach(([r,s])=>{i==null||i.set(r,s)}),o=n.deserializeCollections(t);else return;if(!(!e||e.items.length===0))return new n({metadata:i!=null&&i.size?i:void 0,links:e,subcollections:o!=null&&o.size?o:void 0})}static deserializeCollections(t){if(!t)return;let e=new Map;return Object.entries(t).forEach(([i,o])=>{if(i!=="links"&&i!=="metadata"){let r=n.deserialize(o);if(r){let s=new Array;s.push(r),e.set(i,s)}else if(Array.isArray(o)){let s=o.map(a=>n.deserialize(a)).filter(a=>a!==void 0);e.set(i,s)}}}),e.size?e:void 0}serialize(){let t={};return this.metadata&&(t.metadata={},this.metadata.forEach((e,i)=>t.metadata[i]=e)),this.links.items.length&&(t.links=this.links.serialize()),n.serializeCollection(t,this.subcollections),t}static serializeCollection(t,e){e&&e.size>0&&e.forEach((i,o)=>{i.length===1?t[o]=i[0].serialize():t[o]=i.map(r=>r.serialize())})}};var di=class n{constructor(t){this.context=t.context,this.metadata=t.metadata,this.links=t.links||new it([]),this.readingOrder=t.readingOrder,this.resources=t.resources,this.toc=t.toc,this.subcollections=t.subcollections}static deserialize(t){if(!t)return;let e=Zr.deserialize(t.metadata);if(!e)return;let i=it.deserialize(t.readingOrder?t.readingOrder:t.spine);if(!i)return;let o=new Set(["@context","metadata","links","readingOrder","spine","resources","toc"]),r={};return Object.keys(t).forEach(s=>{o.has(s)||(r[s]=t[s])}),new n({context:tt(t["@context"]),metadata:e,links:it.deserialize(t.links),readingOrder:i,resources:it.deserialize(t.resources),toc:it.deserialize(t.toc),subcollections:ci.deserializeCollections(r)})}serialize(){let t={};return this.context!==void 0&&(t["@context"]=this.context),t.metadata=this.metadata.serialize(),this.links&&this.links.items.length>0&&(t.links=this.links.serialize()),t.readingOrder=this.readingOrder.serialize(),this.resources&&(t.resources=this.resources.serialize()),this.toc&&(t.toc=this.toc.serialize()),ci.serializeCollection(t,this.subcollections),t}linkWithRel(t){let e=new Array;e.push(this.readingOrder),this.resources&&e.push(this.resources),this.links&&e.push(this.links);let i;for(let o of e)if(i=o.findWithRel(t),i!==void 0)return i;return i}linksWithRel(t){let e=[];return e.push(this.readingOrder.filterByRel(t)),this.resources&&e.push(this.resources.filterByRel(t)),this.links&&e.push(this.links.filterByRel(t)),e.reduce((i,o)=>i.concat(o),[])}locatorFromLink(t){var s;let e=t.href.split("#")[0],i=this.linkWithHref(e);if(!i)return;let o=i.type;if(!o)return;let r=t.href.includes("#");return new G({href:t.href,type:o,title:(s=i.title)!=null?s:t.title,locations:new ct({progression:r?void 0:0})})}linkWithHref(t){let e=a=>{let l;for(let c of a)if(l=c.findWithHref(t),l!==void 0)return l;let h=new Array;return a.forEach(c=>{let d=[];for(let u of c.items)u.alternates&&d.push(u.alternates),u.children&&d.push(u.children);h.push(...d)}),h.length>0&&(l=e(h)),l},i=[];i.push(this.readingOrder),this.resources&&i.push(this.resources),this.links&&i.push(this.links);let o=e(i);if(o!==void 0)return o;let r=t.split(/[#]/);if(r.length<2)return;let s=r[0];return this.linkWithHref(s)}get baseURL(){var i;let t=(i=this.links)==null?void 0:i.items.find(o=>o.rels&&o.rels.has("self"));if(!t)return;let e=t.href;if(e)try{let o=new URL(e);return o.search="",o.hash="",o.pathname=o.pathname.substring(0,o.pathname.lastIndexOf("/")+1),o.href}catch{return e.split(/[?#]/)[0].replace(/[^/]*$/,"")}}setSelfLink(t){this.links||(this.links=new it([])),this.links.items=this.links.items.filter(e=>{var i;return e.rels===void 0||!((i=e.rels)!=null&&i.has("self"))}),this.links.items.push(new at({href:t,type:rt.READIUM_WEBPUB_MANIFEST.string,rels:new Set(["self"])}))}};p();p();var Xi=class n{constructor(t){this.guided=t.guided}static deserialize(t){if(!t)return;let e=hn.deserializeArray(t.guided);if(!(!e||e.length===0))return new n({guided:e})}serialize(){return{guided:this.guided.map(t=>t.serialize())}}},ui=class n{constructor(t){this.plain=t.plain,this.ssml=t.ssml,this.language=t.language}static deserialize(t){if(t!=null){if(typeof t=="string")return t.length>0?new n({plain:t}):void 0;if(t.plain||t.ssml)return new n({plain:t.plain,ssml:t.ssml,language:t.language})}}serialize(){let t={};return this.plain!==void 0&&(t.plain=this.plain),this.ssml!==void 0&&(t.ssml=this.ssml),this.language!==void 0&&(t.language=this.language),Object.keys(t).length>0?t:void 0}},ln=class n{constructor(t){this.audioref=t.audioref,this.imgref=t.imgref,this.textref=t.textref,this.videoref=t.videoref,this.text=t.text}static deserialize(t){if(!t)return;if(typeof t=="string"){let i=ui.deserialize(t);return i?new n({text:i}):void 0}let e=new n({audioref:t.audioref,imgref:t.imgref,textref:t.textref,videoref:t.videoref,text:ui.deserialize(t.text)});if(!(e.audioref===void 0&&e.imgref===void 0&&e.textref===void 0&&e.videoref===void 0&&e.text===void 0))return e}serialize(){var i;let t={};this.audioref!==void 0&&(t.audioref=this.audioref),this.imgref!==void 0&&(t.imgref=this.imgref),this.textref!==void 0&&(t.textref=this.textref),this.videoref!==void 0&&(t.videoref=this.videoref);let e=(i=this.text)==null?void 0:i.serialize();return e!==void 0&&(t.text=e),t}},hn=class n{constructor(t){this.id=t.id,this.audioref=t.audioref,this.children=t.children,this.imgref=t.imgref,this.role=t.role,this.text=t.text,this.textref=t.textref,this.videoref=t.videoref,this.description=t.description}get plainText(){var t;return(t=this.text)==null?void 0:t.plain}get ssmlText(){var t;return(t=this.text)==null?void 0:t.ssml}get textLanguage(){var t;return(t=this.text)==null?void 0:t.language}static deserialize(t){if(!t)return;let e=n.deserializeArray(t.children),i=new n({id:typeof t.id=="string"?t.id:void 0,audioref:t.audioref,children:e&&e.length>0?e:void 0,imgref:t.imgref,role:t.role?new Set(tt(t.role)):void 0,text:ui.deserialize(t.text),textref:t.textref,videoref:t.videoref,description:ln.deserialize(t.description)});if(!(i.audioref===void 0&&i.imgref===void 0&&i.textref===void 0&&i.videoref===void 0&&i.text===void 0&&i.children===void 0))return i}static deserializeArray(t){if(Array.isArray(t))return t.map(e=>n.deserialize(e)).filter(e=>e!==void 0)}serialize(){let t={};if(this.id!==void 0&&(t.id=this.id),this.audioref!==void 0&&(t.audioref=this.audioref),this.children!==void 0&&(t.children=this.children.map(e=>e.serialize())),this.imgref!==void 0&&(t.imgref=this.imgref),this.role!==void 0&&(t.role=ce(this.role)),this.text!==void 0){let e=this.text.serialize();e!==void 0&&(t.text=e)}return this.textref!==void 0&&(t.textref=this.textref),this.videoref!==void 0&&(t.videoref=this.videoref),this.description!==void 0&&(t.description=this.description.serialize()),t}get audioFile(){var t;return(t=this.audioref)==null?void 0:t.split("#")[0]}get audioTime(){var t;if((t=this.audioref)!=null&&t.includes("#"))return this.audioref.split("#",2)[1]}get textFile(){var t;return(t=this.textref)==null?void 0:t.split("#")[0]}get fragmentId(){var t;if((t=this.textref)!=null&&t.includes("#"))return this.textref.split("#",2)[1]}get clip(){let t=this.audioFile;if(!t)return;let e=this.audioTime,i={audioResource:t,fragmentId:this.fragmentId};if(!e)return i;let o=this.parseTimer(e);return i.start=o[0],i.end=o[1],i}parseTimer(t){if(!t||!t.startsWith("t="))return[void 0,void 0];let e=t.substring(2).split(",").map(i=>parseFloat(i));return e.length===1?[isNaN(e[0])?void 0:e[0],void 0]:e.length>2?[void 0,void 0]:[isNaN(e[0])?void 0:e[0],isNaN(e[1])?void 0:e[1]]}};var mi=class{constructor(t){this.fetcher=new Ai,this.guides=new Map,t.fetcher&&(this.fetcher=t.fetcher),this.manifest=t.manifest,this.context=t.manifest.context,this.metadata=t.manifest.metadata,this.links=t.manifest.links,this.readingOrder=t.manifest.readingOrder,this.resources=t.manifest.resources,this.toc=t.manifest.toc,this.subcollections=t.manifest.subcollections}get timeline(){return this._timeline||(this._timeline=qr(this)),this._timeline}get baseURL(){return this.manifest.baseURL}linkWithHref(t){return this.manifest.linkWithHref(t)}linksWithRole(t){var i;let e=(i=this.subcollections)==null?void 0:i.get(t);return e&&e.length>0?e[0].links:void 0}linksWithRel(t){return this.manifest.linksWithRel(t)}linkWithRel(t){return this.manifest.linkWithRel(t)}getCover(){let t=[this.links,this.resources,this.readingOrder].filter(Boolean);for(let e of t){let i=e.items.find(o=>{var r;return(r=o.rels)==null?void 0:r.has("cover")});if(i)return i}for(let e of t){let i=e.items.find(o=>o.mediaType.isBitmap||o.mediaType.matches(rt.SVG));if(i)return i}}async positionsFromManifest(){var i;let t=(i=this.manifest.links)==null?void 0:i.findWithMediaType("application/vnd.readium.position-list+json");if(t===void 0)return[];let e=await this.get(t).readAsJSON();return e.total?e.positions.map(o=>G.deserialize(o)).filter(o=>o!==void 0):[]}async guideForLink(t,e){var a;let i=l=>{var h;return(h=l.alternates)==null?void 0:h.findWithMediaType("application/guided-navigation+json")},o=i(t);if(!o){let l=this.linkWithHref(t.href);l!==void 0&&(o=i(l))}if(o){let l=await this.fetchGuide(o,t);if(!(e!=null&&e.skipAudio)||!l||!cn(l.guided))return l}let r=(a=this.manifest.links)==null?void 0:a.findWithMediaType("application/guided-navigation+json");if(!r)return;let s=await this.fetchGuide(r,t);if(!(e!=null&&e.skipAudio&&s&&cn(s.guided)))return s}fetchGuide(t,e){let i=t.href;if(t.templated){let r=new pe(i),s={};return r.parameters.has("ref")&&(s.ref=e.href.split("#")[0]),this.loadGuide(r.expand(s))}let o=this.guides.get(i);return o||(o=this.loadGuide(i),this.guides.set(i,o),o.catch(()=>this.guides.delete(i))),o}async loadGuide(t){let e=await this.get(new at({href:t})).readAsJSON();return Xi.deserialize(e)}get(t){return this.fetcher.get(t)}};function cn(n){return!!(n!=null&&n.some(t=>t.audioref!==void 0||cn(t.children)))}p();p();p();p();p();p();function Ki(n){return typeof n=="object"&&n!==null&&n.nodeType===Node.ELEMENT_NODE}p();p();p();var Jt={NONE:"",DESCENDANT:" ",CHILD:" > "},B={id:"id",class:"class",tag:"tag",attribute:"attribute",nthchild:"nthchild",nthoftype:"nthoftype"};p();function Qr(n,t){return Object.values(n).includes(t)}p();var Uh="CssSelectorGenerator";function Ie(n="unknown problem",...t){console.warn(`${Uh}: ${n}`,...t)}var Ih={selectors:[B.id,B.class,B.tag,B.attribute],includeTag:!1,whitelist:[],blacklist:[],combineWithinSelector:!0,combineBetweenSelectors:!0,root:null,maxCombinations:Number.POSITIVE_INFINITY,maxCandidates:Number.POSITIVE_INFINITY,useScope:!1,ignoreGeneratedClassNames:!1};function pi(n){return!!n}function Hh(n){return Array.isArray(n)?n.filter(t=>Qr(B,t)):[]}function un(n){return n instanceof RegExp}function Wh(n){return["string","function"].includes(typeof n)||un(n)}function ts(n){return Array.isArray(n)?n.filter(Wh):[]}function Bh(n){return n!=null&&typeof n=="object"&&"nodeType"in n&&typeof n.nodeType=="number"}function es(n){let t=[Node.DOCUMENT_NODE,Node.DOCUMENT_FRAGMENT_NODE,Node.ELEMENT_NODE];return Bh(n)&&t.includes(n.nodeType)}function mn(n,t){if(es(n))return n.contains(t)||Ie("element root mismatch","Provided root does not contain the element. This will most likely result in producing a fallback selector using element's real root node. If you plan to use the selector using provided root (e.g. `root.querySelector`), it will not work as intended."),n;let e=t.getRootNode({composed:!1});return es(e)?(e.nodeType!==Node.DOCUMENT_NODE&&Ie("shadow root inferred","You did not provide a root and the element is a child of Shadow DOM. This will produce a selector using ShadowRoot as a root. If you plan to use the selector using document as a root (e.g. `document.querySelector`), it will not work as intended."),e):gi(t)}function dn(n){return typeof n=="number"?n:Number.POSITIVE_INFINITY}function is(n,t={}){let e=Object.assign(Object.assign({},Ih),t);return{selectors:Hh(e.selectors),whitelist:ts(e.whitelist),blacklist:ts(e.blacklist),root:mn(e.root,n),combineWithinSelector:pi(e.combineWithinSelector),combineBetweenSelectors:pi(e.combineBetweenSelectors),includeTag:pi(e.includeTag),maxCombinations:dn(e.maxCombinations),maxCandidates:dn(e.maxCandidates),useScope:pi(e.useScope),maxResults:dn(e.maxResults),ignoreGeneratedClassNames:pi(e.ignoreGeneratedClassNames)}}function At(n=[]){let[t=[],...e]=n;return e.length===0?t:e.reduce((i,o)=>{let r=new Set(o);return i.filter(s=>r.has(s))},t)}function os(n){return[].concat(...n)}function jh(n){return n.replace(/[|\\{}()[\]^$+?.]/g,"\\$&").replace(/\*/g,".+")}function fe(n){let t=n.map(e=>{if(un(e))return i=>e.test(i);if(typeof e=="function")return i=>{let o=e(i);return typeof o!="boolean"?(Ie("pattern matcher function invalid","Provided pattern matching function does not return boolean. It's result will be ignored.",e),!1):o};if(typeof e=="string"){let i=new RegExp("^"+jh(e)+"$");return o=>i.test(o)}return Ie("pattern matcher invalid","Pattern matching only accepts strings, regular expressions and/or functions. This item is invalid and will be ignored.",e),()=>!1});return e=>t.some(i=>i(e))}function fi(n,t,e){let i=mn(e,n[0]).querySelectorAll(t);if(i.length!==n.length)return!1;let o=new Set(i);return n.every(r=>o.has(r))}function pn(n,t){t=t!=null?t:gi(n);let e=[],i=n;for(;i&&i!==t;)Ki(i)&&e.push(i),i=i.parentNode;return e}function ns(n,t){return At(n.map(e=>pn(e,t)))}function rs(n){return typeof n=="object"&&n!==null&&"nodeType"in n&&n.nodeType===Node.DOCUMENT_FRAGMENT_NODE&&"host"in n}function gi(n){return n.ownerDocument.querySelector(":root")}p();var Yi=", ",ss=new RegExp(["^$","\\s"].join("|")),as=new RegExp(["^$"].join("|")),qi=[B.nthoftype,B.tag,B.id,B.class,B.attribute,B.nthchild];p();p();p();var Gh=fe(["class","id","ng-*"]);function Vh({name:n}){return`[${n}]`}function $h({name:n,value:t}){return`[${n}='${t}']`}function Xh({nodeName:n,nodeValue:t},e){let i=e.tagName.toLowerCase();return["input","option"].includes(i)&&n==="value"||n==="src"&&(t!=null&&t.startsWith("data:"))?!1:!Gh(n)}function Kh({nodeName:n,nodeValue:t}){return{name:Mt(n),value:Mt(t!=null?t:void 0)}}function gn(n,t){let e=Array.from(n.attributes).filter(i=>Xh(i,n)).map(Kh);return[...e.map(Vh),...e.map($h)]}function ls(n,t){let e=n.map(i=>gn(i));return At(e)}p();var Yh=/^[a-z_-]{3,}$/i,qh=/[bcdfghjklmnpqrstvwxyz]{4,}/i;function Jh(n){if(!Yh.test(n)||n.includes("_")&&!n.includes("__")||/^(css|sc|jsx|emotion|makeStyles|MuiButton|MuiBox)-/i.test(n))return!1;let t=n.split(new RegExp("--|__|[-]|(?<=[a-z])(?=[A-Z])")).filter(e=>e.length>0);if(t.length===0||t.length===1&&t[0].length<4)return!1;for(let e of t)if(e.length<=2||qh.test(e))return!1;return!0}function fn(n,t){var e;let i=((e=n.getAttribute("class"))!==null&&e!==void 0?e:"").trim().split(/\s+/).filter(r=>!as.test(r)),o=i;if(t!=null&&t.ignoreGeneratedClassNames){let r=fe(t.whitelist);o=i.filter(s=>{let a=`.${Mt(s)}`;return r(a)?!0:Jh(s)})}return o.map(r=>`.${Mt(r)}`)}function hs(n,t){let e=n.map(i=>fn(i,t));return At(e)}p();function Sn(n,t){var e;let i=(e=n.getAttribute("id"))!==null&&e!==void 0?e:"",o=`#${Mt(i)}`,r=n.getRootNode({composed:!1});return!ss.test(i)&&fi([n],o,r)?[o]:[]}function cs(n,t){return n.length===0||n.length>1?[]:Sn(n[0])}p();function yn(n,t){let e=n.parentNode,i=e&&"children"in e?e.children:null;if(i){for(let o=0;o<i.length;o++)if(i[o]===n)return[`:nth-child(${String(o+1)})`]}return[]}function ds(n,t){return At(n.map(e=>yn(e)))}p();p();function _n(n,t){return[Mt(n.tagName.toLowerCase())]}function Ji(n,t){let e=[...new Set(os(n.map(i=>_n(i))))];return e.length===0||e.length>1?[]:[e[0]]}function bn(n,t){let e=Ji([n])[0],i=n.parentNode,o=i&&"children"in i?i:null;if(o){let r=Array.from(o.children).filter(s=>s.tagName.toLowerCase()===e).indexOf(n);if(r>-1)return[`${e}:nth-of-type(${String(r+1)})`]}return[]}function us(n,t){return At(n.map(e=>bn(e)))}p();function*vn(n=[],{maxResults:t=Number.POSITIVE_INFINITY}={}){let e=0,i=ps(1);for(;i.length<=n.length&&e<t;){e+=1;let o=new Array(i.length);for(let r=0;r<i.length;r++)o[r]=n[i[r]];yield o,i=Zh(i,n.length-1)}}function ms(n=[],{maxResults:t=Number.POSITIVE_INFINITY}={}){return Array.from(vn(n,{maxResults:t}))}function Zh(n=[],t=0){let e=n.length;if(e===0)return n;let i=e-1;for(;i>=0&&n[i]===t-(e-1-i);)i-=1;if(i<0)return ps(e+1);n[i]+=1;for(let o=i+1;o<e;o++)n[o]=n[o-1]+1;return n}function ps(n=1){let t=new Array(n);for(let e=0;e<n;e++)t[e]=e;return t}p();function*gs(n={}){let t=Object.entries(n);if(t.length===0)return;let e=[{index:t.length-1,partial:{}}];for(;e.length>0;){let i=e.pop();if(!i)break;let{index:o,partial:r}=i;if(o<0){yield r;continue}let[s,a]=t[o];for(let l=a.length-1;l>=0;l--)e.push({index:o-1,partial:Object.assign(Object.assign({},r),{[s]:a[l]})})}}var Qh="3a".toUpperCase(),tc=/[ !"#$%&'()[\]{|}<>*+,./;=?@^`~\\]/;function Mt(n=""){return CSS?CSS.escape(n):ec(n)}function ec(n=""){return n.split("").map(t=>t===":"?`\\${Qh} `:tc.test(t)?`\\${t}`:escape(t).replace(/%/g,"\\")).join("")}var ic={tag:Ji,id:cs,class:hs,attribute:ls,nthchild:ds,nthoftype:us},oc={tag:_n,id:Sn,class:fn,attribute:gn,nthchild:yn,nthoftype:bn};function Ss(n,t,e){return oc[t](n,e)}function nc(n,t,e){let i=ic[t];return i(n,e)}function rc(n=[],t,e){return n.filter(i=>e(i)||!t(i))}function sc(n=[],t){return n.sort((e,i)=>{let o=t(e),r=t(i);return o&&!r?-1:!o&&r?1:0})}function Zi(){let n=new Map,t;return(e,i)=>{if(e.length!==1)return t!=null?t:t=fs(e,i);let[o]=e,r=n.get(o);return r||(r=fs(e,i),n.set(o,r)),r}}function*ac(n,t,e=Zi()){let i=new Set,o=e(n,t);for(let r of dc(o,t))i.has(r)||(i.add(r),yield r)}function fs(n,t){let{blacklist:e,whitelist:i,combineWithinSelector:o,maxCombinations:r}=t,s=fe(e),a=fe(i),l=(h,c)=>{let d=nc(n,c,t),u=rc(d,s,a),m=sc(u,a);return h[c]=o?Array.from(vn(m,{maxResults:r})):m.map(g=>[g]),h};return lc(t).reduce(l,{})}function lc(n){let{selectors:t,includeTag:e}=n,i=[...t];return e&&!i.includes("tag")&&i.push("tag"),i}function hc(n){return n.includes(B.tag)||n.includes(B.nthoftype)?[...n]:[...n,B.tag]}function cc(n){let{selectors:t,combineBetweenSelectors:e,includeTag:i,maxCandidates:o}=n,r=e?ms(t,{maxResults:o}):t.map(s=>[s]);return i?r.map(hc):r}function*dc(n,t){for(let e of cc(t))yield*uc(e,n)}function*uc(n,t){let e={};for(let i of n){let o=t[i];o&&o.length>0&&(e[i]=o)}for(let i of gs(e))yield pc(i)}function mc(n,t){return t[n]?t[n].join(""):""}function pc(n={}){let t=[...qi];return n[B.tag]&&n[B.nthoftype]&&t.splice(t.indexOf(B.tag),1),t.map(e=>mc(e,n)).join("")}function gc(n,t){return[...n.map(e=>t+Jt.DESCENDANT+e),...n.map(e=>t+Jt.CHILD+e)]}function*fc(n,t){if(t==="")yield*n;else for(let e of n)yield*gc([e],t)}function*Sc(n,t,e="",i,o=Zi()){let r=ac(n,i,o);for(let s of fc(r,e))fi(n,s,t)&&(yield s)}function*yc(n,t,e="",i,o=Zi()){if(n.length===0)return null;let r=[n.length>1?n:[],...ns(n,t).map(s=>[s])];for(let s of r)for(let a of Sc(s,t,e,i,o))yield{foundElements:s,selector:a}}function*ys({elements:n,root:t,rootSelector:e="",options:i}){let o=t,r=e,s=!0,a=Zi();for(;s;){let l=!1;for(let h of yc(n,o,r,i,a)){let{foundElements:c,selector:d}=h;if(l=!0,fi(n,d,t))yield d;else{o=c[0],r=d;break}}l||(s=!1)}}function _s(n){(n instanceof NodeList||n instanceof HTMLCollection)&&(n=Array.from(n));let t=(Array.isArray(n)?n:[n]).filter(Ki);return[...new Set(t)]}function _c(n){return{value:n,include:!1}}function bs(n,t,e=Jt.NONE){let i={};return t.forEach(o=>{Reflect.set(i,o,Ss(n,o).map(_c))}),{element:n,operator:e,selectors:i}}function vs({selectors:n,operator:t}){let e=[...qi];n[B.tag]&&n[B.nthoftype]&&(e=e.filter(o=>o!==B.tag));let i="";return e.forEach(o=>{var r;((r=n[o])!==null&&r!==void 0?r:[]).forEach(({value:s,include:a})=>{a&&(i+=s)})}),t+i}function bc(n,t){let e=pn(n,t).reverse(),i=rs(t),o=e.map((r,s)=>{var a;let l=bs(r,[B.nthchild],i&&s===0?Jt.NONE:Jt.CHILD);return((a=l.selectors.nthchild)!==null&&a!==void 0?a:[]).forEach(h=>{h.include=!0}),l});return[i?"":t?":scope":":root",...o.map(vs)].join("")}function ws(n,t){return n.map(e=>bc(e,t)).join(Yi)}var vc=function(n,t){var e={};for(var i in n)Object.prototype.hasOwnProperty.call(n,i)&&t.indexOf(i)<0&&(e[i]=n[i]);if(n!=null&&typeof Object.getOwnPropertySymbols=="function")for(var o=0,i=Object.getOwnPropertySymbols(n);o<i.length;o++)t.indexOf(i[o])<0&&Object.prototype.propertyIsEnumerable.call(n,i[o])&&(e[i[o]]=n[i[o]]);return e};function wn(n,t={}){let e=Object.assign(Object.assign({},t),{maxResults:1});return wc(n,e).next().value}function*wc(n,t={}){var e;let i=_s(n),o=is(i[0],t),r=(e=o.root)!==null&&e!==void 0?e:gi(i[0]),s=0;for(let l of ys({elements:i,options:o,root:r,rootSelector:""}))if(yield l,s++,s>=o.maxResults)return;if(i.length>1){let{maxResults:l}=t,h=vc(t,["maxResults"]);if(yield i.map(c=>wn(c,h)).join(Yi),s++,s>=o.maxResults)return}let a=t.root!==void 0;yield ws(i,o.useScope||a?r:void 0)}p();p();var Rc=Math.pow(2,32),Rs=()=>Math.round(Math.random()*Rc).toString(36),He=()=>`${Math.round(performance.now())}-${Rs()}-${Rs()}`;var Zt=1,Si=class{constructor(t){this.destination=null,this.registrar=new Map,this.origin="",this.channelId="",this.receiver=this.receive.bind(this),this.preLog=[],this.wnd=t,t.addEventListener("message",this.receiver)}receive(t){if(t.source===null)throw Error("Event source is null");if(typeof t.data!="object")return;let e=t.data;if(!(!("_readium"in e)||!e._readium||e._readium<=0)){if(e.key==="_ping"){if(!this.destination){if(this.destination=t.source,this.origin=t.origin,this.channelId=e._channel,e._readium!==Zt){e._readium>Zt?this.send("error",`received comms version ${e._readium} higher than ${Zt}`):this.send("error",`received comms version ${e._readium} lower than ${Zt}`),this.destination=null,this.origin="",this.channelId="";return}this.send("_pong",void 0),this.preLog.forEach(i=>this.send("log",i)),this.preLog=[]}return}else if(this.channelId){if(e._channel!==this.channelId||t.origin!==this.origin)return}else return;this.handle(e)}}handle(t){let e=this.registrar.get(t.key);if(!e||e.length===0){t.strict&&this.send("_unhandled",t);return}e.forEach(i=>i.cb(t.data,o=>{this.send("_ack",o,t.id)}))}register(t,e,i){Array.isArray(t)||(t=[t]),t.forEach(o=>{let r=this.registrar.get(o);if(r&&r.length>=0){if(r.find(s=>s.module===e))throw new Error(`Trying to register another callback for combination of event ${o} and module ${e}`);r.push({cb:i,module:e}),this.registrar.set(o,r)}else this.registrar.set(o,[{cb:i,module:e}])})}unregister(t,e){Array.isArray(t)||(t=[t]),t.forEach(i=>{let o=this.registrar.get(i);!o||o.length===0||o.splice(o.findIndex(r=>r.module===e),1)})}unregisterAll(t){this.registrar.forEach((e,i)=>this.registrar.set(i,e.filter(o=>o.module!==t)))}log(...t){this.destination?this.send("log",t):this.preLog.push(t)}get ready(){return!!this.destination}destroy(){this.destination=null,this.channelId="",this.preLog=[],this.registrar.clear(),this.wnd.removeEventListener("message",this.receiver)}send(t,e,i=void 0,o=[]){if(!this.destination)throw Error("Attempted to send comms message before destination has been initialized");let r={_readium:Zt,_channel:this.channelId,id:i!=null?i:He(),key:t,data:e};try{this.destination.postMessage(r,{targetOrigin:this.origin,transfer:o})}catch(s){if(o.length>0)throw s;this.destination.postMessage(r,this.origin,o)}}};p();p();p();p();p();p();p();function Cs(n){return n.split("").reverse().join("")}function Cc(n,t,e){let i=Cs(t);return e.map(o=>{let r=Math.max(0,o.end-t.length-o.errors),s=Cs(n.slice(r,o.end));return{start:xs(s,i,o.errors).reduce((a,l)=>o.end-l.end<a?o.end-l.end:a,o.end),end:o.end,errors:o.errors}})}function Rn(n){return(n|-n)>>31&1}function Es(n,t,e,i){let o=n.P[e],r=n.M[e],s=i>>>31,a=t[e]|s,l=a|r,h=(a&o)+o^o|a,c=r|~(h|o),d=o&h,u=Rn(c&n.lastRowMask[e])-Rn(d&n.lastRowMask[e]);return c<<=1,d<<=1,d|=s,c|=Rn(i)-s,o=d|~(l|c),r=c&l,n.P[e]=o,n.M[e]=r,u}function xs(n,t,e){if(t.length===0)return[];e=Math.min(e,t.length);let i=[],o=32,r=Math.ceil(t.length/o)-1,s={P:new Uint32Array(r+1),M:new Uint32Array(r+1),lastRowMask:new Uint32Array(r+1)};s.lastRowMask.fill(1<<31),s.lastRowMask[r]=1<<(t.length-1)%o;let a=new Uint32Array(r+1),l=new Map,h=[];for(let u=0;u<256;u++)h.push(a);for(let u=0;u<t.length;u+=1){let m=t.charCodeAt(u);if(l.has(m))continue;let g=new Uint32Array(r+1);l.set(m,g),m<h.length&&(h[m]=g);for(let b=0;b<=r;b+=1){g[b]=0;for(let S=0;S<o;S+=1){let y=b*o+S;y>=t.length||t.charCodeAt(y)===m&&(g[b]|=1<<S)}}}let c=Math.max(0,Math.ceil(e/o)-1),d=new Uint32Array(r+1);for(let u=0;u<=c;u+=1)d[u]=(u+1)*o;d[r]=t.length;for(let u=0;u<=c;u+=1)s.P[u]=-1,s.M[u]=0;for(let u=0;u<n.length;u+=1){let m=n.charCodeAt(u),g;m<h.length?g=h[m]:(g=l.get(m),typeof g>"u"&&(g=a));let b=0;for(let S=0;S<=c;S+=1)b=Es(s,g,S,b),d[S]+=b;if(d[c]-b<=e&&c<r&&(g[c+1]&1||b<0)){c+=1,s.P[c]=-1,s.M[c]=0;let S;if(c===r){let y=t.length%o;S=y===0?o:y}else S=o;d[c]=d[c-1]+S-b+Es(s,g,c,b)}else for(;c>0&&d[c]>=e+o;)c-=1;c===r&&d[c]<=e&&(d[c]<e&&i.splice(0,i.length),i.push({start:-1,end:u+1,errors:d[c]}),e=d[c])}return i}function Ps(n,t,e){let i=xs(n,t,e);return Cc(n,t,i)}function ks(n,t,e){let i=0,o=[];for(;i!==-1;)i=n.indexOf(t,i),i!==-1&&(o.push({start:i,end:i+t.length,errors:0}),i+=1);return o.length>0?o:Ps(n,t,e)}function Fs(n,t){return t.length===0||n.length===0?0:1-ks(n,t,t.length)[0].errors/t.length}function Ts(n,t,e={}){if(t.length===0)return null;let i=Math.min(256,t.length/2),o=ks(n,t,i);if(o.length===0)return null;let r=a=>{let l=1-a.errors/t.length,h=e.prefix?Fs(n.slice(Math.max(0,a.start-e.prefix.length),a.start),e.prefix):1,c=e.suffix?Fs(n.slice(a.end,a.end+e.suffix.length),e.suffix):1,d=1;return typeof e.hint=="number"&&(d=1-Math.abs(a.start-e.hint)/n.length),(50*l+20*h+20*c+2*d)/92},s=o.map(a=>({start:a.start,end:a.end,score:r(a)}));return s.sort((a,l)=>l.score-a.score),s[0]}p();p();function Cn(n,t,e){let i=e===1?t:t-1;if(n.charAt(i).trim()!=="")return t;let o,r;if(e===2?(o=n.substring(0,t),r=o.trimEnd()):(o=n.substring(t),r=o.trimStart()),!r.length)return-1;let s=o.length-r.length;return e===2?t-s:t+s}function zs(n,t){let e=n.commonAncestorContainer.ownerDocument.createNodeIterator(n.commonAncestorContainer,NodeFilter.SHOW_TEXT),i=t===1?n.startContainer:n.endContainer,o=t===1?n.endContainer:n.startContainer,r=e.nextNode();for(;r&&r!==i;)r=e.nextNode();t===2&&(r=e.previousNode());let s=-1,a=()=>{if(r=t===1?e.nextNode():e.previousNode(),r){let l=r.textContent,h=t===1?0:l.length;s=Cn(l,h,t)}};for(;r&&s===-1&&r!==o;)a();if(r&&s>=0)return{node:r,offset:s};throw new RangeError("No text nodes with non-whitespace text found in range")}function Os(n){if(!n.toString().trim().length)throw new RangeError("Range contains no non-whitespace text");if(n.startContainer.nodeType!==Node.TEXT_NODE)throw new RangeError("Range startContainer is not a text node");if(n.endContainer.nodeType!==Node.TEXT_NODE)throw new RangeError("Range endContainer is not a text node");let t=n.cloneRange(),e=!1,i=!1,o={start:Cn(n.startContainer.textContent,n.startOffset,1),end:Cn(n.endContainer.textContent,n.endOffset,2)};if(o.start>=0&&(t.setStart(n.startContainer,o.start),e=!0),o.end>0&&(t.setEnd(n.endContainer,o.end),i=!0),e&&i)return t;if(!e){let{node:r,offset:s}=zs(t,1);r&&s>=0&&t.setStart(r,s)}if(!i){let{node:r,offset:s}=zs(t,2);r&&s>0&&t.setEnd(r,s)}return t}function As(n){var t,e;switch(n.nodeType){case Node.ELEMENT_NODE:case Node.TEXT_NODE:return(e=(t=n.textContent)==null?void 0:t.length)!=null?e:0;default:return 0}}function Ls(n){let t=n.previousSibling,e=0;for(;t;)e+=As(t),t=t.previousSibling;return e}function Ms(n,...t){let e=t.shift(),i=n.ownerDocument.createNodeIterator(n,NodeFilter.SHOW_TEXT),o=[],r=i.nextNode(),s,a=0;for(;e!==void 0&&r;)s=r,a+s.data.length>e?(o.push({node:s,offset:e-a}),e=t.shift()):(r=i.nextNode(),a+=s.data.length);for(;e!==void 0&&s&&a===e;)o.push({node:s,offset:s.data.length}),e=t.shift();if(e!==void 0)throw new RangeError("Offset exceeds text length");return o}var We=class n{constructor(t,e){if(e<0)throw new Error("Offset is invalid");this.element=t,this.offset=e}relativeTo(t){if(!t.contains(this.element))throw new Error("Parent is not an ancestor of current element");let e=this.element,i=this.offset;for(;e!==t;)i+=Ls(e),e=e.parentElement;return new n(e,i)}resolve(t={}){try{return Ms(this.element,this.offset)[0]}catch(e){if(this.offset===0&&t.direction!==void 0){let i=document.createTreeWalker(this.element.getRootNode(),NodeFilter.SHOW_TEXT);i.currentNode=this.element;let o=t.direction===1,r=o?i.nextNode():i.previousNode();if(!r)throw e;return{node:r,offset:o?0:r.data.length}}else throw e}}static fromCharOffset(t,e){switch(t.nodeType){case Node.TEXT_NODE:return n.fromPoint(t,e);case Node.ELEMENT_NODE:return new n(t,e);default:throw new Error("Node is not an element or text node")}}static fromPoint(t,e){switch(t.nodeType){case Node.TEXT_NODE:{if(e<0||e>t.data.length)throw new Error("Text node offset is out of range");if(!t.parentElement)throw new Error("Text node has no parent");let i=Ls(t)+e;return new n(t.parentElement,i)}case Node.ELEMENT_NODE:{if(e<0||e>t.childNodes.length)throw new Error("Child node offset is out of range");let i=0;for(let o=0;o<e;o++)i+=As(t.childNodes[o]);return new n(t,i)}default:throw new Error("Point is not in an element or text node")}}},Be=class n{constructor(t,e){this.start=t,this.end=e}relativeTo(t){return new n(this.start.relativeTo(t),this.end.relativeTo(t))}toRange(){let t,e;this.start.element===this.end.element&&this.start.offset<=this.end.offset?[t,e]=Ms(this.start.element,this.start.offset,this.end.offset):(t=this.start.resolve({direction:1}),e=this.end.resolve({direction:2}));let i=new Range;return i.setStart(t.node,t.offset),i.setEnd(e.node,e.offset),i}static fromRange(t){let e=We.fromPoint(t.startContainer,t.startOffset),i=We.fromPoint(t.endContainer,t.endOffset);return new n(e,i)}static fromOffsets(t,e,i){return new n(new We(t,e),new We(t,i))}static trimmedRange(t){return Os(n.fromRange(t).toRange())}};var En=class n{constructor(t,e,i){this.root=t,this.start=e,this.end=i}static fromRange(t,e){let i=Be.fromRange(e).relativeTo(t);return new n(t,i.start.offset,i.end.offset)}static fromSelector(t,e){return new n(t,e.start,e.end)}toSelector(){return{type:"TextPositionSelector",start:this.start,end:this.end}}toRange(){return Be.fromOffsets(this.root,this.start,this.end).toRange()}},Qi=class n{constructor(t,e,i={}){this.root=t,this.exact=e,this.context=i}static fromRange(t,e){let i=t.textContent,o=Be.fromRange(e).relativeTo(t),r=o.start.offset,s=o.end.offset,a=32;return new n(t,i.slice(r,s),{prefix:i.slice(Math.max(0,r-a),r),suffix:i.slice(s,Math.min(i.length,s+a))})}static fromSelector(t,e){let{prefix:i,suffix:o}=e;return new n(t,e.exact,{prefix:i,suffix:o})}toSelector(){return{type:"TextQuoteSelector",exact:this.exact,prefix:this.context.prefix,suffix:this.context.suffix}}toRange(t={}){return this.toPositionAnchor(t).toRange()}toPositionAnchor(t={}){let e=this.root.textContent,i=Ts(e,this.exact,{...this.context,hint:t.hint});if(!i)throw new Error("Quote not found");return new En(this.root,i.start,i.end)}};function Ec(n){let t=n.tagName.toUpperCase();return t==="IMG"||t==="VIDEO"||t==="AUDIO"||t==="IFRAME"||t==="OBJECT"||t==="EMBED"||t==="CANVAS"}function Ns(n,t){var o;let e=t&&$t(t),i=null;if(e)try{i=n.querySelector(e)}catch(r){console.warn(`Invalid cssSelector: ${e}`,r)}return(o=i!=null?i:n.body)!=null?o:n.documentElement}function Ds(n,t){let e;try{e=n.querySelector(t.cssSelector)}catch(o){return console.error(`Invalid domRange cssSelector: ${t.cssSelector}`,o),null}if(!e)return console.error(`Can't resolve domRange cssSelector: ${t.cssSelector}`),null;let i=0;for(let o of e.childNodes)if(o.nodeType===Node.TEXT_NODE){if(i===t.textNodeIndex)return{node:o,offset:t.charOffset};i++}return console.error(`Can't resolve domRange textNodeIndex ${t.textNodeIndex} for selector: ${t.cssSelector}`),null}function je(n,t){try{let e=t.locations,i=t.text;if(e){let o=Qo(e);if(o){let r=Ds(n,o.start),s=o.end?Ds(n,o.end):r;if(r&&s)try{let a=n.createRange();return r.offset!==void 0?a.setStart(r.node,r.offset):a.setStartBefore(r.node),s.offset!==void 0?a.setEnd(s.node,s.offset):a.setEndBefore(s.node),a}catch(a){console.warn("Invalid domRange, falling back:",a)}}}if(e){let o=tn(e);if(o){let r=Ns(n,e),s=Zo(o,n,r);if(s.length>0)return s[0]}}if(i&&i.highlight){let o=Ns(n,e),r=new Qi(o,i.highlight,{prefix:i.before,suffix:i.after});try{return r.toRange()}catch{return console.warn("Quote not found:",r),null}}if(e){let o=null;if(!o&&$t(e)&&(o=n.querySelector($t(e))),!o&&e.fragments){for(let r of e.fragments)if(o=n.getElementById(Gt(r)),o)break}if(o){let r=n.createRange();return o.childNodes.length===0||Ec(o)?(r.selectNode(o),r):(r.setStartBefore(o),r.setEndAfter(o),r)}}}catch(e){console.error(e)}return null}p();var yt=class{};var Us="readium-snapper-style",xn="readium-navigation-lock-style",Pn=class yi extends yt{constructor(){super(...arguments),this.protected=!1,this.locked=!1,this.watchedRanges=[],this.watchedWithoutText=[],this.timelineEntries=new Map,this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts=new Map}static inDomOrder(t,e,i){let o=t.get(e),r=t.get(i);return!o||!r?0:o.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1}updateTimelineEntries(t,e){this.cachedFragmentIds=t,this.timelineEntries.clear(),this.cachedFragmentStarts.clear();for(let i of t){let o=e.document.getElementById(i);o&&this.timelineEntries.set(i,o)}this.sortedFragmentIds=Array.from(this.timelineEntries.keys()).sort((i,o)=>yi.inDomOrder(this.timelineEntries,i,o)),this.refreshFragmentStarts()}refreshFragmentStarts(){for(let[t,e]of this.timelineEntries)this.cachedFragmentStarts.set(t,this.fragmentStart(e))}fragmentStart(t){return this.rectStart(t.getBoundingClientRect())}currentScrollExtent(){return{pos:0,size:0}}rectStart(t){return 0}lineStart(t){return this.rectStart(t)}registerTextLayout(t,e,i){this.textLayoutComms=e,e.register("watch_text_layout",i,(o,r)=>{let s=Array.isArray(o)?o:[];this.watchedRanges=s.map(a=>yi.rangeOf(t,a)),this.watchedWithoutText=s.map(a=>{var l;return!((l=Ct.deserialize(Array.isArray(a)?a[0]:a))!=null&&l.highlight)}),t.requestAnimationFrame(()=>this.sendTextLayout(!0)),r(!0)})}registerNavigationLock(t,e,i){e.register("lock_navigation",i,(o,r)=>{var s;if(this.locked=o===!0,(s=t.document.getElementById(xn))==null||s.remove(),this.locked){let a=t.document.createElement("style");a.dataset.readium="true",a.id=xn,a.textContent=`
                :root {
                    overflow: hidden !important;
                    touch-action: none !important;
                }`,t.document.head.appendChild(a)}r(!0)})}unlockNavigation(t){var e;this.locked=!1,(e=t.document.getElementById(xn))==null||e.remove()}unwatchTextLayout(){this.watchedRanges=[],this.watchedWithoutText=[],this.textLayoutComms=void 0}sendTextLayout(t=!1){var i;if(!((i=this.textLayoutComms)!=null&&i.ready)||this.watchedRanges.length===0)return;let e={viewport:this.currentScrollExtent()};t&&(e.pieces=this.watchedRanges.map((o,r)=>{if(!o)return null;let s=this.lineStarts(o);return this.watchedWithoutText[r]?{...s,text:o.toString()}:s})),this.textLayoutComms.send("text_layout",e)}static rangeOf(t,e){var r;let[i,o]=Array.isArray(e)?e:[e];return(r=je(t.document,new G({href:t.location.href,type:"text/html",text:Ct.deserialize(i),locations:o?new ct({otherLocations:new Map([["cssSelector",o]])}):void 0})))!=null?r:null}lineStarts(t){var l;let e=t.startContainer.ownerDocument,i={offsets:[],starts:[]},o=e.createTreeWalker(t.commonAncestorContainer,NodeFilter.SHOW_TEXT),r=o.currentNode.nodeType===Node.TEXT_NODE?o.currentNode:o.nextNode(),s=0,a=!1;for(;r;r=o.nextNode()){if(!t.intersectsNode(r)){if(s>0)break;continue}let h=(l=r.textContent)!=null?l:"",c=r===t.startContainer?t.startOffset:0,d=r===t.endContainer?t.endOffset:h.length;if(c>=d)continue;let u=[];for(let R=c;R<d;R++){u.push(s);let v=/\s/.test(h[R]);(!v||!a)&&s++,a=v}let m=R=>{let v=e.createRange();v.setStart(r,R),v.setEnd(r,R+1);let C=v.getClientRects()[0];return C&&(C.width||C.height)?Math.round(this.lineStart(C)):void 0},g=(R,v)=>{i.starts.length>0&&i.starts[i.starts.length-1]===v||(i.offsets.push(u[R-c]),i.starts.push(v))},b=(R,v,C,z)=>{if(v===z)return;if(C-R===1)return g(C,z);let k=R+C>>1,T=m(k);for(;T===void 0&&++k<C;)T=m(k);if(T===void 0)return g(C,z);b(R,v,k,T),b(k,T,C,z)},S=c,y=m(S);for(;y===void 0&&++S<d;)y=m(S);if(y===void 0)continue;let f=d-1,w=m(f);for(;w===void 0&&--f>S;)w=m(f);g(S,y),w!==void 0&&b(S,y,f,w)}return i}nearestPrecedingTimelineEntry(t){let e;for(let i of this.sortedFragmentIds){let o=this.timelineEntries.get(i),r=o.compareDocumentPosition(t);if(o===t||o.contains(t)||(r&Node.DOCUMENT_POSITION_FOLLOWING)!==0)e=i;else break}return e}fragmentFromGeometry(){for(let e of this.sortedFragmentIds){let i=this.timelineEntries.get(e);if(this.inCenterBand(i))return e}let t;for(let e of this.sortedFragmentIds){let i=this.timelineEntries.get(e);if(this.hasScrolledPast(i))t=e;else break}return t}firstFragmentIfReached(){let t=this.sortedFragmentIds[0];if(t===void 0)return;let e=this.timelineEntries.get(t);return this.hasScrolledPast(e)?t:void 0}currentTimelineFragment(){let{pos:t,size:e}=this.currentScrollExtent(),i=t+e/2,o;for(let r of this.sortedFragmentIds){let s=this.cachedFragmentStarts.get(r);if(s!==void 0)if(s<=i)o=r;else break}return o}sortedVisibleFragmentIds(){let{pos:t,size:e}=this.currentScrollExtent(),i=t+e,o=-1,r=-1;for(let s=0;s<this.sortedFragmentIds.length;s++){let a=this.cachedFragmentStarts.get(this.sortedFragmentIds[s]);a!==void 0&&(a<=t&&(o=s),a<i&&(r=s))}return o<0&&(o=0),r<o?[]:this.sortedFragmentIds.slice(o,r+1)}inCenterBand(t){return!1}buildStyles(){return`
        html, body {
            touch-action: manipulation;
            user-select: ${this.protected?"none":"auto"};
        }`}mount(t,e){let i=t.document.createElement("style");return i.dataset.readium="true",i.id=Us,i.textContent=this.buildStyles(),t.document.head.appendChild(i),e.register("protect",yi.moduleName,(o,r)=>{this.protected=!0,i.textContent=this.buildStyles(),r(!0)}),e.register("unprotect",yi.moduleName,(o,r)=>{this.protected=!1,i.textContent=this.buildStyles(),r(!0)}),e.log("Snapper Mounted"),!0}unmount(t,e){var i;return(i=t.document.getElementById(Us))==null||i.remove(),this.timelineEntries.clear(),this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts.clear(),e.log("Snapper Unmounted"),!0}};Pn.moduleName="snapper",Pn.CENTER_TOLERANCE=.01;var q=Pn;p();function Is(n){return(n.document.documentElement.dir||n.document.body.dir).toLowerCase()==="rtl"}function Fn(n,t){return n.getComputedStyle(t).direction==="rtl"}function kn(n){return(n.getComputedStyle(n.document.documentElement).writingMode||n.getComputedStyle(n.document.body).writingMode)==="vertical-lr"}function Tn(n){let t=n.getComputedStyle(n.document.documentElement).writingMode||n.getComputedStyle(n.document.body).writingMode;return t==="vertical-rl"||t==="vertical-lr"}var to=2147483646;function Se(n,t){let e=Tn(n),i=e&&kn(n),o=n.innerWidth,r=n.innerHeight,s=n.document.scrollingElement,a=s.scrollLeft,l=s.scrollTop,h=parseInt(n.getComputedStyle(n.document.documentElement).getPropertyValue("column-count")),c=t==null?void 0:t.getBoundingClientRect(),d=c?-c.left:e&&!i?s.scrollWidth-o+a:a,u=c?-c.top:l;return{isVertical:e,isVertLR:i,viewportInlineSize:e?r:o,viewportBlockSize:e?o:r,pageInlineSize:e?r:o/(h||1),xDocOffset:d,yDocOffset:u,inlineScrollOffset:e?u:d,blockScrollOffset:e?d:u,inlineStart:m=>e?m.top:m.left,blockStart:m=>e?m.left:m.top,inlineSize:m=>e?m.height:m.width,blockSize:m=>e?m.width:m.height,applyPosition(m,g,b,S,y,f){m.style.position="absolute",m.style.zIndex=String(to),e?(m.style.top=`${g*f}px`,m.style.left=`${b*f}px`,m.style.height=`${S*f}px`,m.style.width=`${y*f}px`):(m.style.left=`${g*f}px`,m.style.top=`${b*f}px`,m.style.width=`${S*f}px`,m.style.height=`${y*f}px`)},toRect(m,g,b,S){return e?new DOMRect(g,m,S,b):new DOMRect(m,g,b,S)}}}function zn(n){return parseInt(n.getComputedStyle(n.document.documentElement).getPropertyValue("column-count"))}function xc(n){let t=getComputedStyle(n),e=parseFloat(t.paddingTop||"0"),i=parseFloat(t.paddingBottom||"0");return n.clientHeight-e-i}function On(n){let t=zn(n);if(!t)return!1;let e=n.document.querySelectorAll("div[id^='readium-virtual-page']");for(let l of e)l.remove();let i=e.length,o=n.document.scrollingElement.scrollWidth,r=n.visualViewport.width,s=Math.round(o/r*t)%t,a=t===1||s===0?0:t-s;if(a>0)for(let l=0;l<a;l++){let h=n.document.createElement("div");h.setAttribute("id",`readium-virtual-page-${l}`),h.dataset.readium="true",CSS.supports("break-before","column")?h.style.breakBefore="column":(CSS.supports("break-inside","avoid-column")&&(h.style.breakInside="avoid-column"),h.style.height=xc(n.document.documentElement)+"px"),h.innerHTML="&#8203;",n.document.body.appendChild(h)}return i!==a}function Ge(n){let t=n.document.createElement("style");t.appendChild(n.document.createTextNode("*{}")),n.document.body.appendChild(t),n.document.body.removeChild(t)}p();var eo=()=>typeof window.CSSTransformValue<"u",Pc=new Set(["backgroundColor","textColor","linkColor","visitedColor","primaryColor","secondaryColor","selectionBackgroundColor","selectionTextColor","blendFilter","darkenFilter","invertFilter","invertGaiji"]),Hs=/--(?:USER|RS)__([\w-]+)/g;function Ws(n,t){let e=n!=null?n:"",i=t!=null?t:"",o=new Set;for(let r of e.matchAll(Hs))o.add(r[1]);for(let r of i.matchAll(Hs))o.add(r[1]);for(let r of o)if(!Pc.has(r))return!0;return!1}function _i(n){let t={},e=n.document.documentElement.style;for(let i in n.document.documentElement.style)Object.hasOwn(e,i)&&!Number.isNaN(Number.parseInt(i))&&(t[e[i]]=e.getPropertyValue(e[i]));return t}function io(n,t){let e=_i(n);Object.keys(e).forEach(i=>{t.hasOwnProperty(i)||ye(n,i)}),Object.entries(t).forEach(([i,o])=>{e[i]!==o&&Qt(n,i,o)})}function Ln(n,t){return n.document.documentElement.style.getPropertyValue(t)}function Qt(n,t,e){n.document.documentElement.style.setProperty(t,e)}function ye(n,t){n.document.documentElement.style.removeProperty(t)}p();function Bs(n){return n<.5?2*n*n:-1+(4-2*n)*n}p();function W(n){let t=n.getSelection();t&&t.removeAllRanges()}var Fc=["a","area","audio","button","canvas","details","input","label","option","select","submit","textarea","video"],kc=["dialog","radiogroup","radio","menu","menuitem"];function bi(n){return Tc(n)?null:An(n)?n:n.parentElement?bi(n.parentElement):null}function Tc(n){return n?n.closest("[inert]")!==null||n.hasAttribute("disabled"):!0}function An(n){var t;return n?n.role&&kc.includes(n.role)?!0:n.tagName.toLowerCase()==="iframe"?!1:n.tabIndex>=0?!0:Fc.includes(n.nodeName.toLowerCase())||n.hasAttribute("contenteditable")&&((t=n.getAttribute("contenteditable"))==null?void 0:t.toLowerCase())!=="false":!1}function te(n,t){let e=js(n,n.document.body,t),i=n._readium_cssSelectorGenerator.getCssSelector(e,{selectors:["tag","id","class","nthchild","nthoftype","attribute"]});return new G({href:"#",type:"application/xhtml+xml",locations:new ct({otherLocations:new Map([["cssSelector",i]])}),text:new Ct({highlight:e.textContent||void 0})})}function js(n,t,e){for(var i=0;i<t.children.length;i++){let o=t.children[i];if(!Lc(o)&&zc(n,o,e))return Oc(n,o)?o:js(n,o,e)}return t}function zc(n,t,e){if(t===document.body||t===document.documentElement)return!0;if(!document||!document.documentElement||!document.body)return!1;let i=t.getBoundingClientRect();return e?i.bottom>0&&i.top<n.innerHeight:i.right>0&&i.left<n.innerWidth}function Oc(n,t){let e=t.getBoundingClientRect();return e.top>=0&&e.left>=0&&e.bottom<=n.innerHeight&&e.right<=n.innerWidth}function Lc(n){let t=getComputedStyle(n);if(t){let e=t.getPropertyValue("display");if(e!="block"&&e!="list-item"||t.getPropertyValue("opacity")==="0")return!0}return!1}p();p();var Gs={maxVelocity:200,minVariance:.01,historySize:20,minDirectionChanges:.2,maxConsistentScrolls:15},Ve={maxVelocity:200,minVariance:1e-5,historySize:100,minDirectionChanges:.1,maxConsistentScrolls:20},oo={maxSelectionsPerSecond:500,minVariance:50,historySize:20},Vs={enabled:!0,maxSelectionPercent:.1,minThreshold:100,absoluteMaxChars:5e3,historySize:20};var Nt=class{constructor(t={}){this.history=[],this.consistentScrollCount=0,this.options={...Gs,...t}}analyze(t,e,i){if(i<=0)return!1;let o=Math.abs(e)/i,r=Date.now();if(this.history.push({timestamp:r,direction:t,velocity:o,distance:Math.abs(e)}),this.history=this.history.filter(g=>r-g.timestamp<2e3).slice(-(this.options.historySize||20)),this.history.length<3)return!1;if(o>this.options.maxVelocity)return this.resetAfterDetection(),!0;let s=this.history.map(g=>g.velocity),a=this.history.map(g=>g.distance),l=s.reduce((g,b)=>g+b,0)/s.length,h=a.reduce((g,b)=>g+b,0)/a.length,c=s.reduce((g,b)=>g+Math.pow(b-l,2),0)/s.length,d=a.reduce((g,b)=>g+Math.pow(b-h,2),0)/a.length;if(c<this.options.minVariance&&d<h*.1){if(this.consistentScrollCount++,this.consistentScrollCount>=(this.options.maxConsistentScrolls||10))return this.resetAfterDetection(),!0}else this.consistentScrollCount=Math.max(0,this.consistentScrollCount-1);let u=0,m=this.history[0].direction;for(let g=1;g<this.history.length;g++)this.history[g].direction!==m&&(u++,m=this.history[g].direction);return u/this.history.length>(this.options.minDirectionChanges||.3)?(this.resetAfterDetection(),!0):!1}resetAfterDetection(){this.history=this.history.slice(-3),this.consistentScrollCount=0}clear(){this.history=[],this.consistentScrollCount=0}};var $s="readium-column-snapper-style",Ac=200,Xs=class lt extends q{constructor(){super(...arguments),this.isSnapProtectionEnabled=!1,this.patternAnalyzer=null,this.lastTurnTime=0,this.rtl=!1,this.shakeTimeout=0,this.snappingCancelled=!1,this.alreadyScrollLeft=0,this.overscroll=0,this.cachedScrollWidth=0,this.touchState=0,this.startingX=void 0,this.endingX=void 0,this.onTouchStarter=this.onTouchStart.bind(this),this.onTouchEnder=this.onTouchEnd.bind(this),this.onWidthChanger=this.onWidthChange.bind(this),this.onTouchMover=this.onTouchMove.bind(this)}doc(){return this.wnd.document.scrollingElement}scrollOffset(){let t=this.doc().scrollLeft;return t!==0?t:this.alreadyScrollLeft}snapOffset(t){let e=t+(this.rtl?-1:1);return e-e%this.wnd.innerWidth}snapNormOffset(t){let e=t+1;return e-e%this.wnd.innerWidth}normScroll(){let t=this.doc().scrollLeft||(this.doc().style.transform?this.alreadyScrollLeft:0);return this.rtl?Math.abs(t):Math.max(0,this.wnd.scrollX>0?this.wnd.scrollX:t)}currentScrollExtent(){return{pos:this.normScroll(),size:this.wnd.innerWidth}}rectStart(t){return this.normScroll()+(this.rtl?this.wnd.innerWidth-t.right:t.left)}lineStart(t){let e=this.rectStart(t);return e-e%this.wnd.innerWidth}hasScrolledPast(t){let e=t.getBoundingClientRect();return this.rtl?e.left>=this.wnd.innerWidth:e.right<=0}currentTimelineFragment(){if(this.timelineEntries.size===0)return;let t=this.wnd.innerWidth,e;for(let i of this.sortedFragmentIds){let o=this.timelineEntries.get(i).getBoundingClientRect();if(this.rtl?o.right>0:o.left<t)e=i;else break}return e}sortedVisibleFragmentIds(){let t=this.wnd.innerWidth;return this.sortedFragmentIds.filter(e=>{let i=this.timelineEntries.get(e).getBoundingClientRect();return this.rtl?i.left<t&&i.right>0:i.right>0&&i.left<t})}reportProgress(t){let e=this.cachedScrollWidth,i=this.wnd.innerWidth,o=this.normScroll(),r=Math.max(1,e-i),s=Math.max(0,Math.min(1,o/r)),a=Math.max(0,Math.min(1,(o+i)/e));this.comms.send("progress",{start:s,end:a,fragmentId:t!==void 0?t:this.currentTimelineFragment(),visibleFragmentIds:this.sortedVisibleFragmentIds()}),this.sendTextLayout()}shake(){if(this.overscroll!==0||this.shakeTimeout!==0)return;let t=this.doc(),e=this.normScroll()<5,i=this.rtl?e?"readium-bounce-r":"readium-bounce-l":"readium-bounce-r";t.classList.add(i);let o=this.scrollOffset();this.shakeTimeout=this.wnd.setTimeout(()=>{t.classList.remove(i),this.shakeTimeout=0,this.doc().scrollLeft=o},150)}takeOverSnap(){var e;this.snappingCancelled=!0,this.clearTouches();let t=this.doc();this.overscroll=((e=t.style.transform)==null?void 0:e.length)>12?parseFloat(t.style.transform.slice(12).split("px")[0]):0}snapCurrentOffset(t=!1,e=!1){let i=this.doc(),o=zn(this.wnd),r=this.cachedScrollWidth-this.wnd.innerWidth,s=Math.min(Math.max(0,this.normScroll()),r),a=this.dragOffset(),l=this.rtl?-a:a,h=this.wnd.innerWidth/3*(l>0?2:1),c=Math.min(r,Math.max(0,this.snapNormOffset(s+h))),d=this.rtl?-c:c,u=this.rtl?-s:s,m=d>u?"right":"left";if(this.checkSuspiciousSnap(m,Math.abs(d-u)),t&&d!==u){this.snappingCancelled=!1;let g=(f,w,R,v)=>R>v?w:f+(w-f)*Bs(R/v),b=Ac*o,S,y=f=>{if(this.snappingCancelled)return;S||(S=f);let w=f-S,R=g(this.overscroll,0,w,b),v=g(u,d,w,b);i.scrollLeft=v,this.overscroll!==0&&(eo()?i.attributeStyleMap.set("transform",new CSSTransformValue([new CSSTranslate(CSS.px(-R),CSS.px(0),CSS.px(0))])):i.style.transform=`translate3d(${-R}px, 0px, 0px)`),w<b?this.wnd.requestAnimationFrame(y):(this.clearTouches(),i.style.removeProperty("transform"),i.scrollLeft=d,e||this.reportProgress())};this.wnd.requestAnimationFrame(y)}else i.style.removeProperty("transform"),this.wnd.requestAnimationFrame(()=>{i.scrollLeft=d,this.clearTouches(),e||this.reportProgress()})}dragOffset(){var t,e;return((t=this.startingX)!=null?t:0)-((e=this.endingX)!=null?e:0)}clearTouches(){this.startingX=void 0,this.endingX=void 0,this.overscroll=0}onTouchStart(t){if(t.stopPropagation(),!this.locked){switch(this.takeOverSnap(),t.touches.length){case 1:break;case 2:this.onTouchEnd(t);return;default:{this.onTouchEnd(t),this.comms.send("tap_more",t.touches.length);return}}this.startingX=t.touches[0].clientX,this.alreadyScrollLeft=this.doc().scrollLeft,this.touchState=1}}onTouchEnd(t){if(this.touchState===2){let e=this.dragOffset(),i=this.normScroll(),o=this.cachedScrollWidth-this.wnd.innerWidth,r=this.rtl?-e:e;this.cachedScrollWidth<=this.wnd.innerWidth?(this.reportProgress(),r>5&&this.comms.send("no_more",void 0),r<-5&&this.comms.send("no_less",void 0)):i<5&&r<5?(this.alreadyScrollLeft=0,this.comms.send("no_less",void 0)):o-i<5&&r>5&&(this.alreadyScrollLeft=this.rtl?-o:o,this.comms.send("no_more",void 0)),this.snapCurrentOffset(!0),this.comms.send("swipe",e)}this.touchState=0}onWidthChange(){this.cachedScrollWidth=this.doc().scrollWidth,this.comms.ready&&(this.snapCurrentOffset(),this.sendTextLayout(!0))}onTouchMove(t){if(this.touchState===0)return;this.touchState===1&&(this.touchState=2,W(this.wnd)),this.endingX=t.touches[0].clientX;let e=this.dragOffset(),i=this.alreadyScrollLeft+e,o=this.rtl?-(this.cachedScrollWidth-this.wnd.innerWidth):0,r=this.rtl?0:this.cachedScrollWidth-this.wnd.innerWidth;i<o?(this.overscroll=i,eo()?this.doc().attributeStyleMap.set("transform",new CSSTransformValue([new CSSTranslate(CSS.px(-i),CSS.px(0),CSS.px(0))])):this.doc().style.transform=`translate3d(${-i}px, 0px, 0px)`):i>r?(this.overscroll=i,eo()?this.doc().attributeStyleMap.set("transform",new CSSTransformValue([new CSSTranslate(CSS.px(-i),CSS.px(0),CSS.px(0))])):this.doc().style.transform=`translate3d(${-i}px, 0px, 0px)`):(this.overscroll=0,this.doc().style.removeProperty("transform"),this.doc().scrollLeft=i)}enableSnapProtection(){var t;this.patternAnalyzer||(this.patternAnalyzer=new Nt({maxVelocity:this.wnd.innerWidth,minVariance:.1,historySize:5,maxConsistentScrolls:3,minDirectionChanges:.3}),this.isSnapProtectionEnabled=!0,(t=this.comms)==null||t.log("Snap protection enabled"))}checkSuspiciousSnap(t,e){var r;if(!this.isSnapProtectionEnabled||!this.patternAnalyzer)return;let i=Date.now(),o=i-(this.lastTurnTime||i);this.lastTurnTime=i,this.patternAnalyzer.analyze(t,e,o)&&((r=this.comms)==null||r.send("content_protection",{type:"suspicious_snapping",timestamp:Date.now(),event:null}))}mount(t,e){if(this.wnd=t,this.comms=e,this.rtl=Is(t),!super.mount(t,e))return!1;t.navigator.epubReadingSystem&&(t.navigator.epubReadingSystem.layoutStyle="paginated");let i=t.document.createElement("style");i.dataset.readium="true",i.id=$s,i.textContent=`
        @keyframes readium-bounce-l-animation {
            0%, 100% {transform: translate3d(0, 0, 0);}
            50% {transform: translate3d(-50px, 0, 0);}
        }

        @keyframes readium-bounce-r-animation {
            0%, 100% {transform: translate3d(0, 0, 0);}
            50% {transform: translate3d(50px, 0, 0);}
        }

        .readium-bounce-l {
            animation: readium-bounce-l-animation 150ms ease-out 1;
        }

        .readium-bounce-r {
            animation: readium-bounce-r-animation 150ms ease-out 1;
        }

        html {
            overflow: hidden;
        }

        body {
            -ms-overflow-style: none; /* for Internet Explorer, Edge */
        }

        * {
            scrollbar-width: none; /* for Firefox */
        }

        body::-webkit-scrollbar {
            display: none; /* for Chrome, Safari, and Opera */
        }
        `,t.document.head.appendChild(i),this.resizeObserver=new ResizeObserver(()=>{t.requestAnimationFrame(()=>{t&&On(t)}),this.onWidthChange()}),this.resizeObserver.observe(t.document.body),this.mutationObserver=new MutationObserver(s=>{for(let a of s)if(a.target===this.wnd.document.documentElement){let l=a.oldValue,h=a.target.getAttribute("style"),c=/transform\s*:\s*([^;]+)/,d=l==null?void 0:l.match(c),u=h==null?void 0:h.match(c);(!d&&!u&&Ws(l,h)||d&&!u||d&&u&&d[1]!==u[1])&&(t.requestAnimationFrame(()=>{t&&On(t)}),this.onWidthChange())}else t.requestAnimationFrame(()=>this.cachedScrollWidth=this.doc().scrollWidth)}),t.frameElement&&this.mutationObserver.observe(t.frameElement,{attributes:!0,attributeFilter:["style"]}),this.mutationObserver.observe(t.document,{attributes:!0,attributeFilter:["style"]}),this.mutationObserver.observe(t.document.documentElement,{attributes:!0,attributeFilter:["style"]}),e.register("scroll_protection",lt.moduleName,(s,a)=>{this.enableSnapProtection(),a(!0)});let o=s=>{let a=this.doc().scrollLeft;return this.doc().scrollLeft=this.snapOffset(s),a!==this.doc().scrollLeft},r=s=>{let a=this.doc().scrollLeft,l=this.snapNormOffset(Math.max(0,Math.min(this.cachedScrollWidth-t.innerWidth,s)));return this.doc().scrollLeft=-l,a!==this.doc().scrollLeft};return t.addEventListener("orientationchange",this.onWidthChanger),t.addEventListener("resize",this.onWidthChanger),t.requestAnimationFrame(()=>this.cachedScrollWidth=this.doc().scrollWidth),this.registerTextLayout(t,e,lt.moduleName),this.registerNavigationLock(t,e,lt.moduleName),e.register("go_progression",lt.moduleName,(s,a)=>{let l=s;if(l<0||l>1){e.send("error",{message:"go_progression must be given a position from 0.0 to 1.0"}),a(!1);return}this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth;let h=(this.cachedScrollWidth-t.innerWidth)*l;this.rtl?this.doc().scrollLeft=-this.snapNormOffset(h):this.doc().scrollLeft=this.snapOffset(h),this.reportProgress(),W(this.wnd),a(!0)})}),e.register("go_id",lt.moduleName,(s,a)=>{let l=t.document.getElementById(s);if(!l){a(!1);return}this.wnd.requestAnimationFrame(()=>{this.rtl?this.doc().scrollLeft=-this.snapNormOffset(this.rectStart(l.getBoundingClientRect())):this.doc().scrollLeft=this.snapOffset(l.getBoundingClientRect().left+t.scrollX);let h=s;this.reportProgress(this.timelineEntries.has(h)?h:this.nearestPrecedingTimelineEntry(l)),W(this.wnd),a(!0)})}),e.register("go_text",lt.moduleName,(s,a)=>{let l=q.rangeOf(t,s);if(!l){a(!1);return}this.wnd.requestAnimationFrame(()=>{this.rtl?this.doc().scrollLeft=-this.snapNormOffset(this.rectStart(l.getBoundingClientRect())):this.doc().scrollLeft=this.snapOffset(l.getBoundingClientRect().left+t.scrollX),this.reportProgress(this.nearestPrecedingTimelineEntry(l.startContainer)),W(this.wnd),a(!0)})}),e.register("go_end",lt.moduleName,(s,a)=>{this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth;let l;if(this.rtl?l=-this.snapNormOffset(this.cachedScrollWidth-t.innerWidth):l=this.snapOffset(this.cachedScrollWidth),this.doc().scrollLeft===l)return a(!1);this.doc().scrollLeft=l,this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length-1]),W(this.wnd),a(!0)})}),e.register("go_start",lt.moduleName,(s,a)=>{this.wnd.requestAnimationFrame(()=>{if(this.doc().scrollLeft===0)return a(!1);this.doc().scrollLeft=0,this.reportProgress(this.firstFragmentIfReached()),W(this.wnd),a(!0)})}),e.register("go_prev",lt.moduleName,(s,a)=>{this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth;let l;this.rtl?l=r(this.normScroll()-t.innerWidth):l=o(t.scrollX-t.innerWidth),this.reportProgress(),l&&(W(this.wnd),this.checkSuspiciousSnap("left",this.wnd.innerWidth)),a(l)})}),e.register("go_next",lt.moduleName,(s,a)=>{this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth;let l;this.rtl?l=r(this.normScroll()+t.innerWidth):l=o(t.scrollX+t.innerWidth),this.reportProgress(),l&&(W(this.wnd),this.checkSuspiciousSnap("right",this.wnd.innerWidth)),a(l)})}),e.register("unfocus",lt.moduleName,(s,a)=>{this.snappingCancelled=!0,W(this.wnd),a(!0)}),e.register("shake",lt.moduleName,(s,a)=>{this.shake(),a(!0)}),e.register("focus",lt.moduleName,(s,a)=>{this.wnd.requestAnimationFrame(()=>{this.cachedScrollWidth=this.doc().scrollWidth,this.snapCurrentOffset(!1,!0),this.reportProgress(),a(!0)})}),e.register("first_visible_locator",lt.moduleName,(s,a)=>{let l=te(t,!1);this.comms.send("first_visible_locator",l.serialize()),a(!0)}),e.register("timeline_entries",lt.moduleName,(s,a)=>{this.updateTimelineEntries(Array.isArray(s)?s:[],t),t.requestAnimationFrame(()=>this.reportProgress()),a(!0)}),t.addEventListener("touchstart",this.onTouchStarter,{passive:!0}),t.addEventListener("touchend",this.onTouchEnder,{passive:!0}),t.addEventListener("touchmove",this.onTouchMover,{passive:!0}),t.document.addEventListener("touchstart",()=>{}),e.log("ColumnSnapper Mounted"),!0}unmount(t,e){var i;return this.snappingCancelled=!0,e.unregisterAll(lt.moduleName),this.unwatchTextLayout(),this.unlockNavigation(t),this.resizeObserver.disconnect(),this.mutationObserver.disconnect(),this.patternAnalyzer&&(this.patternAnalyzer.clear(),this.patternAnalyzer=null,this.isSnapProtectionEnabled=!1),t.removeEventListener("touchstart",this.onTouchStarter),t.removeEventListener("touchend",this.onTouchEnder),t.removeEventListener("touchmove",this.onTouchMover),t.removeEventListener("orientationchange",this.onWidthChanger),t.removeEventListener("resize",this.onWidthChanger),(i=t.document.getElementById($s))==null||i.remove(),this.timelineEntries.clear(),e.log("ColumnSnapper Unmounted"),super.unmount(t,e)}};Xs.moduleName="column_snapper";var Ks=Xs;p();var Ys="readium-scroll-snapper-style",qs=class dt extends q{constructor(){super(...arguments),this.patternAnalyzer=null,this.lastScrollTime=0,this.isScrollProtectionEnabled=!1,this.initialScrollHandled=!1,this.isScrolling=!1,this.lastScrollTop=0,this.isResizing=!1,this.resizeDebounce=null,this.handleScroll=t=>{if(this.comms.ready&&!this.isResizing){if(!this.initialScrollHandled){this.lastScrollTop=this.doc().scrollTop,this.initialScrollHandled=!0,this.reportProgress();return}this.isScrolling||(this.isScrolling=!0,this.wnd.requestAnimationFrame(()=>{var o;this.reportProgress();let e=this.doc().scrollTop,i=e-this.lastScrollTop;if(this.lastScrollTop=e,this.isScrollProtectionEnabled&&Math.abs(i)>5){let r=Date.now(),s=r-(this.lastScrollTime||r);if(this.patternAnalyzer&&this.patternAnalyzer.analyze(i>0?"down":"up",Math.abs(i),s)){let a=t.target&&"tagName"in t.target?{tagName:t.target.tagName}:null;(o=this.comms)==null||o.send("content_protection",{type:"suspicious_scrolling",timestamp:Date.now(),scrollDelta:i,scrollDirection:i>0?"down":"up",targetElement:a})}this.lastScrollTime=r}this.comms.send("scroll",i),this.isScrolling=!1}))}}}doc(){return this.wnd.document.scrollingElement}hasScrolledPast(t){let e=this.wnd.innerHeight/2;return t.getBoundingClientRect().top<=e+this.wnd.innerHeight*q.CENTER_TOLERANCE}inCenterBand(t){let e=t.getBoundingClientRect(),i=this.wnd.innerHeight/2,o=this.wnd.innerHeight*q.CENTER_TOLERANCE,r=i-o,s=i+o;return e.height===0?e.top<=s&&e.top>=r:Math.max(0,Math.min(e.bottom,s)-Math.max(e.top,r))/e.height>=q.CENTER_TOLERANCE}currentScrollExtent(){return{pos:this.doc().scrollTop,size:this.wnd.innerHeight}}rectStart(t){return t.top+this.doc().scrollTop}reportProgress(t){if(!this.comms.ready)return;let e=Math.ceil(this.doc().scrollTop),i=this.doc().scrollHeight,o=this.wnd.innerHeight,r=Math.max(0,Math.min(1,e/i)),s=Math.max(0,Math.min(1,(e+o)/i));this.comms.send("progress",{start:r,end:s,fragmentId:t!==void 0?t:this.currentTimelineFragment(),visibleFragmentIds:this.sortedVisibleFragmentIds()}),this.sendTextLayout()}enableScrollProtection(){var t;this.patternAnalyzer||(this.patternAnalyzer=new Nt(Ve),this.isScrollProtectionEnabled=!0,(t=this.comms)==null||t.log("Scroll protection enabled"))}mount(t,e){this.wnd=t,this.comms=e,this.initialScrollHandled=!1,this.lastScrollTop=0,this.isResizing=!1,this.resizeDebounce&&(this.wnd.clearTimeout(this.resizeDebounce),this.resizeDebounce=null),t.navigator.epubReadingSystem&&(t.navigator.epubReadingSystem.layoutStyle="scrolling");let i=t.document.createElement("style");return i.dataset.readium="true",i.id=Ys,i.textContent=`
        * {
            scrollbar-width: none; /* for Firefox */
        }

        body::-webkit-scrollbar {
            display: none; /* for Chrome, Safari, and Opera */
        }
        `,t.document.head.appendChild(i),this.resizeObserver=new ResizeObserver(()=>{this.resizeDebounce&&this.wnd.clearTimeout(this.resizeDebounce),this.isResizing=!0,this.resizeDebounce=this.wnd.setTimeout(()=>{this.isResizing=!1,this.resizeDebounce=null,this.refreshFragmentStarts(),this.reportProgress(),this.sendTextLayout(!0)},50)}),this.resizeObserver.observe(t.document.body),t.addEventListener("scroll",this.handleScroll,{passive:!0}),e.register("force_webkit_recalc",dt.moduleName,()=>{Ge(this.wnd);let o=this.doc().scrollTop;o>1?this.doc().scrollTop=o-1:this.doc().scrollTop=o+1,this.doc().scrollTop=o}),this.registerTextLayout(t,e,dt.moduleName),this.registerNavigationLock(t,e,dt.moduleName),e.register("go_progression",dt.moduleName,(o,r)=>{let s=o;if(s<0||s>1){e.send("error",{message:"go_progression must be given a position from 0.0 to 1.0"}),r(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=this.doc().offsetHeight*s,this.reportProgress(this.fragmentFromGeometry()),W(this.wnd),r(!0)})}),e.register("go_id",dt.moduleName,(o,r)=>{let s=t.document.getElementById(o);if(!s){r(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=s.getBoundingClientRect().top+t.scrollY-t.innerHeight/2;let a=o;this.reportProgress(this.timelineEntries.has(a)?a:this.nearestPrecedingTimelineEntry(s)),W(this.wnd),r(!0)})}),e.register("go_text",dt.moduleName,(o,r)=>{let s=q.rangeOf(t,o);if(!s){r(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=s.getBoundingClientRect().top+t.scrollY-t.innerHeight/2,this.reportProgress(this.nearestPrecedingTimelineEntry(s.startContainer)),W(this.wnd),r(!0)})}),e.register("go_start",dt.moduleName,(o,r)=>{if(this.doc().scrollTop===0)return r(!1);this.doc().scrollTop=0,this.reportProgress(this.firstFragmentIfReached()),r(!0)}),e.register("go_end",dt.moduleName,(o,r)=>{if(this.doc().scrollTop===this.doc().scrollHeight-this.doc().offsetHeight)return r(!1);this.doc().scrollTop=this.doc().scrollHeight-this.doc().offsetHeight,this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length-1]),r(!0)}),e.register("unfocus",dt.moduleName,(o,r)=>{W(this.wnd),r(!0)}),e.register("scroll_protection",dt.moduleName,(o,r)=>{this.enableScrollProtection(),r(!0)}),e.register(["go_next","go_prev"],dt.moduleName,(o,r)=>r(!1)),e.register("focus",dt.moduleName,(o,r)=>{this.reportProgress(),r(!0)}),e.register("first_visible_locator",dt.moduleName,(o,r)=>{let s=te(t,!0);this.comms.send("first_visible_locator",s.serialize()),r(!0)}),e.register("timeline_entries",dt.moduleName,(o,r)=>{this.updateTimelineEntries(Array.isArray(o)?o:[],t),r(!0)}),e.log("ScrollSnapper Mounted"),!0}unmount(t,e){var i;return e.unregisterAll(dt.moduleName),this.unwatchTextLayout(),this.unlockNavigation(t),this.resizeObserver.disconnect(),this.handleScroll&&t.removeEventListener("scroll",this.handleScroll),(i=t.document.getElementById(Ys))==null||i.remove(),this.timelineEntries.clear(),this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts.clear(),this.patternAnalyzer&&(this.patternAnalyzer.clear(),this.patternAnalyzer=null,this.isScrollProtectionEnabled=!1),e.log("ScrollSnapper Unmounted"),!0}};qs.moduleName="scroll_snapper";var Js=qs;p();var Zs=class ut extends q{constructor(){super(...arguments),this.patternAnalyzer=null,this.lastScrollTime=0,this.isScrollProtectionEnabled=!1,this.initialScrollHandled=!1,this.isScrolling=!1,this.lastScrollTop=0,this.isResizing=!1,this.resizeDebounce=null,this.handleScroll=t=>{if(this.comms.ready&&!this.isResizing){if(!this.initialScrollHandled){this.lastScrollTop=this.doc().scrollTop,this.initialScrollHandled=!0,this.reportProgress();return}this.isScrolling||(this.isScrolling=!0,this.wnd.requestAnimationFrame(()=>{var o;this.reportProgress();let e=this.doc().scrollTop,i=e-this.lastScrollTop;if(this.lastScrollTop=e,this.isScrollProtectionEnabled&&Math.abs(i)>5){let r=Date.now(),s=r-(this.lastScrollTime||r);if(this.patternAnalyzer&&this.patternAnalyzer.analyze(i>0?"down":"up",Math.abs(i),s)){let a=t.target&&"tagName"in t.target?{tagName:t.target.tagName}:null;(o=this.comms)==null||o.send("content_protection",{type:"suspicious_scrolling",timestamp:Date.now(),scrollDelta:i,scrollDirection:i>0?"down":"up",targetElement:a})}this.lastScrollTime=r}this.comms.send("scroll",i),this.isScrolling=!1}))}}}doc(){return this.wnd.document.scrollingElement}hasScrolledPast(t){let e=this.wnd.innerHeight/2;return t.getBoundingClientRect().top<=e+this.wnd.innerHeight*q.CENTER_TOLERANCE}inCenterBand(t){let e=t.getBoundingClientRect(),i=this.wnd.innerHeight/2,o=this.wnd.innerHeight*q.CENTER_TOLERANCE,r=i-o,s=i+o;return e.height===0?e.top<=s&&e.top>=r:Math.max(0,Math.min(e.bottom,s)-Math.max(e.top,r))/e.height>=q.CENTER_TOLERANCE}currentScrollExtent(){return{pos:this.doc().scrollTop,size:this.wnd.innerHeight}}rectStart(t){return t.top+this.doc().scrollTop}reportProgress(t){if(!this.comms.ready)return;let e=Math.ceil(this.doc().scrollTop),i=this.doc().scrollHeight,o=this.wnd.innerHeight,r=Math.max(0,Math.min(1,e/i)),s=Math.max(0,Math.min(1,(e+o)/i));this.comms.send("progress",{start:r,end:s,fragmentId:t!==void 0?t:this.currentTimelineFragment(),visibleFragmentIds:this.sortedVisibleFragmentIds()}),this.sendTextLayout()}enableScrollProtection(){var t;this.patternAnalyzer||(this.patternAnalyzer=new Nt(Ve),this.isScrollProtectionEnabled=!0,(t=this.comms)==null||t.log("Scroll protection enabled"))}mount(t,e){return this.wnd=t,this.comms=e,this.initialScrollHandled=!1,this.lastScrollTop=0,this.isResizing=!1,this.resizeDebounce&&(this.wnd.clearTimeout(this.resizeDebounce),this.resizeDebounce=null),this.resizeObserver=new ResizeObserver(()=>{this.resizeDebounce&&this.wnd.clearTimeout(this.resizeDebounce),this.isResizing=!0,this.resizeDebounce=this.wnd.setTimeout(()=>{this.isResizing=!1,this.resizeDebounce=null,this.refreshFragmentStarts(),this.reportProgress(),this.sendTextLayout(!0)},50)}),this.resizeObserver.observe(t.document.body),t.addEventListener("scroll",this.handleScroll,{passive:!0}),e.register("force_webkit_recalc",ut.moduleName,()=>{Ge(this.wnd);let i=this.doc().scrollTop;i>1?this.doc().scrollTop=i-1:this.doc().scrollTop=i+1,this.doc().scrollTop=i}),this.registerTextLayout(t,e,ut.moduleName),this.registerNavigationLock(t,e,ut.moduleName),e.register("go_progression",ut.moduleName,(i,o)=>{let r=i;if(r<0||r>1){e.send("error",{message:"go_progression must be given a position from 0.0 to 1.0"}),o(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=this.doc().offsetHeight*r,this.reportProgress(this.fragmentFromGeometry()),W(this.wnd),o(!0)})}),e.register("go_id",ut.moduleName,(i,o)=>{let r=t.document.getElementById(i);if(!r){o(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=r.getBoundingClientRect().top+t.scrollY-t.innerHeight/2;let s=i;this.reportProgress(this.timelineEntries.has(s)?s:this.nearestPrecedingTimelineEntry(r)),W(this.wnd),o(!0)})}),e.register("go_text",ut.moduleName,(i,o)=>{let r=q.rangeOf(t,i);if(!r){o(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollTop=r.getBoundingClientRect().top+t.scrollY-t.innerHeight/2,this.reportProgress(this.nearestPrecedingTimelineEntry(r.startContainer)),W(this.wnd),o(!0)})}),e.register("go_start",ut.moduleName,(i,o)=>{if(this.doc().scrollTop===0)return o(!1);this.doc().scrollTop=0,this.reportProgress(this.firstFragmentIfReached()),o(!0)}),e.register("go_end",ut.moduleName,(i,o)=>{if(this.doc().scrollTop===this.doc().scrollHeight-this.doc().offsetHeight)return o(!1);this.doc().scrollTop=this.doc().scrollHeight-this.doc().offsetHeight,this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length-1]),o(!0)}),e.register("unfocus",ut.moduleName,(i,o)=>{W(this.wnd),o(!0)}),e.register("scroll_protection",ut.moduleName,(i,o)=>{this.enableScrollProtection(),o(!0)}),e.register(["go_next","go_prev"],ut.moduleName,(i,o)=>o(!1)),e.register("focus",ut.moduleName,(i,o)=>{this.reportProgress(),o(!0)}),e.register("first_visible_locator",ut.moduleName,(i,o)=>{let r=te(t,!0);e.send("first_visible_locator",r.serialize()),o(!0)}),e.register("timeline_entries",ut.moduleName,(i,o)=>{this.updateTimelineEntries(Array.isArray(i)?i:[],t),o(!0)}),e.log("WebPubSnapper Mounted"),!0}unmount(t,e){return e.unregisterAll(ut.moduleName),this.unwatchTextLayout(),this.unlockNavigation(t),this.resizeObserver.disconnect(),this.handleScroll&&t.removeEventListener("scroll",this.handleScroll),this.patternAnalyzer&&(this.patternAnalyzer.clear(),this.patternAnalyzer=null,this.isScrollProtectionEnabled=!1),this.timelineEntries.clear(),this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts.clear(),e.log("WebPubSnapper Unmounted"),!0}};Zs.moduleName="webpub_snapper";var Qs=Zs;p();p();function ea(n,t){let e=t.map(l=>l.toUpperCase()),i=[],o=n.commonAncestorContainer,r=o.nodeType===Node.TEXT_NODE?o.parentNode:o,s=n.startContainer.ownerDocument.createTreeWalker(r,NodeFilter.SHOW_TEXT),a=s.nextNode();for(;a;){if(n.intersectsNode(a)){let l=a.parentNode,h=!1;for(;l;){if(l.nodeType===Node.ELEMENT_NODE&&e.includes(l.tagName.toUpperCase())){h=!0;break}l=l.parentNode}if(!h){let c=n.cloneRange();c.selectNode(a),c.compareBoundaryPoints(Range.START_TO_START,n)<0&&c.setStart(n.startContainer,n.startOffset),c.compareBoundaryPoints(Range.END_TO_END,n)>0&&c.setEnd(n.endContainer,n.endOffset);for(let d of c.getClientRects())i.push({left:d.left,right:d.right,top:d.top,bottom:d.bottom,width:d.width,height:d.height})}}a=s.nextNode()}return i}function ee(n,t,e=!1,i=0){let o;if(Array.isArray(n))o=n;else{let h=n.getClientRects();h.length||n.commonAncestorContainer.nodeType===Node.ELEMENT_NODE&&(h=n.commonAncestorContainer.getClientRects()),o=[];for(let c of h)o.push({bottom:c.bottom,height:c.height,left:c.left,right:c.right,top:c.top,width:c.width})}if(i)for(let h of o)h.left-=i,h.top-=i,h.right+=i,h.bottom+=i,h.width+=i*2,h.height+=i*2;let r=ia(o,1,t,e),s=Nc(r,1),a=oa(s),l=4;for(let h=a.length-1;h>=0;h--){let c=a[h];if(!(c.width*c.height>l))if(a.length>1)a.splice(h,1);else break}return a}function ia(n,t,e,i=!1){for(let o=0;o<n.length;o++)for(let r=o+1;r<n.length;r++){let s=n[o],a=n[r];if(s===a)continue;let l=Ft(s.top,a.top,t)&&Ft(s.bottom,a.bottom,t),h=Ft(s.left,a.left,t)&&Ft(s.right,a.right,t);if((h&&!e&&!i||l&&!h)&&na(s,a,t)){let c=n.filter(u=>u!==s&&u!==a),d=Mc(s,a);return c.push(d),ia(c,t,e,i)}}return n}function Mc(n,t){let e=Math.min(n.left,t.left),i=Math.max(n.right,t.right),o=Math.min(n.top,t.top),r=Math.max(n.bottom,t.bottom);return{bottom:r,height:r-o,left:e,right:i,top:o,width:i-e}}function Nc(n,t){let e=new Set(n);for(let i of n){if(!(i.width>1&&i.height>1)){e.delete(i);continue}for(let o of n)if(i!==o&&e.has(o)&&Dc(o,i,t)){e.delete(i);break}}return Array.from(e)}function Dc(n,t,e){return Pt(n,t.left,t.top,e)&&Pt(n,t.right,t.top,e)&&Pt(n,t.left,t.bottom,e)&&Pt(n,t.right,t.bottom,e)}function Pt(n,t,e,i){return(n.left<t||Ft(n.left,t,i))&&(n.right>t||Ft(n.right,t,i))&&(n.top<e||Ft(n.top,e,i))&&(n.bottom>e||Ft(n.bottom,e,i))}function oa(n){for(let t=0;t<n.length;t++)for(let e=t+1;e<n.length;e++){let i=n[t],o=n[e];if(i!==o&&na(i,o,-1)){let r=[],s,a=ta(i,o);if(a.length===1)r=a,s=i;else{let h=ta(o,i);a.length<h.length?(r=a,s=i):(r=h,s=o)}let l=n.filter(h=>h!==s);return Array.prototype.push.apply(l,r),oa(l)}}return n}function ta(n,t){let e=Uc(t,n);if(e.height===0||e.width===0)return[n];let i=[];{let o={bottom:n.bottom,height:0,left:n.left,right:e.left,top:n.top,width:0};o.width=o.right-o.left,o.height=o.bottom-o.top,o.height!==0&&o.width!==0&&i.push(o)}{let o={bottom:e.top,height:0,left:e.left,right:e.right,top:n.top,width:0};o.width=o.right-o.left,o.height=o.bottom-o.top,o.height!==0&&o.width!==0&&i.push(o)}{let o={bottom:n.bottom,height:0,left:e.left,right:e.right,top:e.bottom,width:0};o.width=o.right-o.left,o.height=o.bottom-o.top,o.height!==0&&o.width!==0&&i.push(o)}{let o={bottom:n.bottom,height:0,left:e.right,right:n.right,top:n.top,width:0};o.width=o.right-o.left,o.height=o.bottom-o.top,o.height!==0&&o.width!==0&&i.push(o)}return i}function Uc(n,t){let e=Math.max(n.left,t.left),i=Math.min(n.right,t.right),o=Math.max(n.top,t.top),r=Math.min(n.bottom,t.bottom);return{bottom:r,height:Math.max(0,r-o),left:e,right:i,top:o,width:Math.max(0,i-e)}}function na(n,t,e){return(n.left<t.right||e>=0&&Ft(n.left,t.right,e))&&(t.left<n.right||e>=0&&Ft(t.left,n.right,e))&&(n.top<t.bottom||e>=0&&Ft(n.top,t.bottom,e))&&(t.top<n.bottom||e>=0&&Ft(t.top,n.bottom,e))}function Ft(n,t,e){return Math.abs(n-t)<=e}p();var no=class{constructor(t,e){this.window=t,this.copyHistory=[],this.lastSelectionLength=0,this.lastSelectionTime=0,this.options=e}cleanupOldHistory(t){this.copyHistory=this.copyHistory.filter(e=>t-e.timestamp<1e4),this.copyHistory.length>this.options.historySize&&(this.copyHistory=this.copyHistory.slice(-this.options.historySize))}isSuspiciousPattern(t){return this.copyHistory.length<3?!1:this.copyHistory.filter(e=>t-e.timestamp<2e3).length>=3?!0:this.copyHistory.slice().sort((e,i)=>e.timestamp-i.timestamp).every((e,i,o)=>i===0?!0:e.length>o[i-1].length*1.5)}shouldAllowCopy(t){if(!this.options.enabled)return!0;let e=this.window.getSelection();if(!e)return!0;let i=e.toString().length,o=this.window.document.body.innerText.length,r=Date.now();if(this.cleanupOldHistory(r),i<this.options.minThreshold)return this.copyHistory.push({timestamp:r,length:i,wasBlocked:!1}),!0;let s=r-this.lastSelectionTime<100&&i>this.lastSelectionLength*1.5,a=Math.min(o*this.options.maxSelectionPercent,this.options.absoluteMaxChars),l=this.isSuspiciousPattern(r),h=i>a||s||l;return this.copyHistory.push({timestamp:r,length:i,wasBlocked:h}),h?(t==null||t.preventDefault(),!1):(this.lastSelectionLength=i,this.lastSelectionTime=r,!0)}destroy(){this.lastSelectionLength=0,this.lastSelectionTime=0,this.copyHistory=[],this.options.enabled=!1}};p();var ro=class{constructor(t=oo){this.options=t,this.events=[],this.selectionStartTime=0,this.lastSelectionTime=0,this.lastSelectionPosition=0,this.selectionPatterns=[],this.lastSelectedText=""}analyze(t){if(!t)return this.clear(),!1;let e=t.toString();if(e.length===0)return this.clear(),!1;if(t.type!=="Range"||!t.rangeCount)return!1;let i=Date.now();if(e.length<=50||e===this.lastSelectedText)return!1;if(this.selectionStartTime===0)return this.selectionStartTime=i,this.lastSelectedText=e,!1;if(i-this.selectionStartTime<500)return!1;i-this.lastSelectionTime>1e3&&(this.lastSelectionTime=i),this.selectionStartTime===0&&(this.selectionStartTime=i),this.lastSelectedText=e;let o=this.analyzeSelectionPattern(t,i);return this.cleanup(i),o}analyzeSelectionPattern(t,e){if(!t.rangeCount)return!1;let i=t.getRangeAt(0),o=i.toString(),r=(e-this.selectionStartTime)/1e3;if(o.length/Math.max(1,r)>this.options.maxSelectionsPerSecond)return!0;let s=i.startOffset,a=Math.abs(s-this.lastSelectionPosition);return this.selectionPatterns.push(a),this.selectionPatterns.length>this.options.historySize&&(this.selectionPatterns.shift(),this.calculateVariance(this.selectionPatterns)<this.options.minVariance)?!0:(this.lastSelectionPosition=s,!1)}calculateVariance(t){if(t.length===0)return 0;let e=t.reduce((i,o)=>i+o,0)/t.length;return t.reduce((i,o)=>i+Math.pow(o-e,2),0)/t.length}cleanup(t){this.events=this.events.filter(e=>t-e.timestamp<=1e3)}clear(){this.events=[],this.selectionStartTime=0,this.lastSelectionTime=0,this.lastSelectionPosition=0,this.selectionPatterns=[],this.lastSelectedText=""}};p();var _e=class{match(t,e){for(let i of e)if(this.matchesCombo(t,i))return!0;return!1}matchesCombo(t,e){return t.keyCode===e.keyCode&&this.matchesModifier(t.ctrlKey,e.ctrl)&&this.matchesModifier(t.shiftKey,e.shift)&&this.matchesModifier(t.altKey,e.alt)&&this.matchesModifier(t.metaKey,e.meta)}matchesModifier(t,e){return e===void 0?!t:t===e}createKeyHandler(t,e){return i=>{this.match(i,t)&&(i.preventDefault(),i.stopPropagation(),e(i))}}createActivityEvent(t,e,i,o){var a,l,h;let r,s;if(o){let c=o.getSelection(),d=(c==null?void 0:c.toString())||"",u=(l=d&&(c!=null&&c.rangeCount)?(a=c.getRangeAt(0))==null?void 0:a.getClientRects():null)==null?void 0:l[0];u&&d&&(r={text:d,x:u.x,y:u.y,width:u.width,height:u.height});let m=o.document.activeElement;m&&m!==o.document.body&&(s=(h=bi(m))==null?void 0:h.outerHTML)}return{type:e,timestamp:Date.now(),key:t.key,code:t.code,keyCode:t.keyCode,ctrlKey:t.ctrlKey,altKey:t.altKey,shiftKey:t.shiftKey,metaKey:t.metaKey,targetFrameSrc:i,selectedText:r,interactiveElement:s}}createKeyboardHandlers(t,e,i,o){let r=[];return e.forEach(s=>{r.push(...s.keyCombos.map(a=>({...a,handler:l=>{let h=s.type,c=this.createActivityEvent(l,h,t,o);i(c)}})))}),r}createUnifiedHandler(t,e,i,o){let r=this.createKeyboardHandlers(t,e,i,o);return s=>{var a;if(s.isTrusted){for(let l of r)if(this.match(s,[l])){let h=l.suppressOnInteractiveElement;if(h){let c=((a=o==null?void 0:o.document)!=null?a:document).activeElement;if(Array.isArray(h)?h.some(d=>c==null?void 0:c.matches(d)):An(c))return}s.preventDefault(),s.stopPropagation(),l.handler(s);return}}}}};var ra=class $e extends yt{constructor(){super(...arguments),this.configApplied=!1,this.cleanupCallbacks=[],this.pointerMoved=!1,this.isContextMenuEnabled=!1,this.isDragAndDropEnabled=!1,this.isSelectionMonitoringEnabled=!1,this.isBulkCopyProtectionEnabled=!1,this.selectionAnalyzer=null,this.currentSelection=null,this.bulkCopyProtector=null,this.keyManager=new _e,this.keyDownHandler=null,this.preventBulkCopy=t=>{var e,i,o,r;if(!this.isBulkCopyProtectionEnabled||!this.bulkCopyProtector)return!0;if(!this.bulkCopyProtector.shouldAllowCopy(t)){t.preventDefault();let s=this.wnd.getSelection(),a=(s==null?void 0:s.toString())||"",l=(i=a?(e=s==null?void 0:s.getRangeAt(0))==null?void 0:e.getClientRects():null)==null?void 0:i[0],h={type:"bulk_copy",timestamp:Date.now(),clipboardTypes:(o=t.clipboardData)!=null&&o.types?[...t.clipboardData.types]:[],selectedText:l?{text:a,x:l.x,y:l.y,width:l.width,height:l.height}:void 0,selectionLength:a.length,targetFrameSrc:this.wnd.location.href};return(r=this.comms)==null||r.send("content_protection",h),!1}return!0},this.handleSelection=t=>{var i,o,r,s,a,l,h;if(!this.isSelectionMonitoringEnabled||!this.wnd||!this.selectionAnalyzer)return;let e=this.wnd.getSelection();if(e){if(this.currentSelection=e.toString(),this.selectionAnalyzer.analyze(e)&&this.currentSelection){let c=this.wnd.getSelection(),d=(c==null?void 0:c.toString())||"",u=(o=d&&(c!=null&&c.rangeCount)?(i=c.getRangeAt(0))==null?void 0:i.getClientRects():null)==null?void 0:o[0],m={type:"suspicious_selection",timestamp:Date.now(),selectionLength:d.length,selectedText:{text:d,x:(r=u==null?void 0:u.x)!=null?r:0,y:(s=u==null?void 0:u.y)!=null?s:0,width:(a=u==null?void 0:u.width)!=null?a:0,height:(l=u==null?void 0:u.height)!=null?l:0},eventType:(t==null?void 0:t.type)||"selectionchange",targetFrameSrc:this.wnd.location.href};(h=this.comms)==null||h.send("content_protection",m)}}else this.currentSelection=null},this.onDragOver=t=>{this.isDragAndDropEnabled&&(t.preventDefault(),t.stopPropagation())},this.onDragStart=t=>{var e,i;if(this.isDragAndDropEnabled){t.preventDefault();let o={type:"drag_detected",timestamp:Date.now(),dataTransferTypes:(e=t.dataTransfer)!=null&&e.types?[...t.dataTransfer.types]:[],targetFrameSrc:this.wnd.location.href};return(i=this.comms)==null||i.send("content_protection",o),!1}else return!0},this.onDrop=t=>{var e,i;if(this.isDragAndDropEnabled){t.preventDefault();let o=t.dataTransfer,r={type:"drop_detected",timestamp:Date.now(),dataTransferTypes:o!=null&&o.types?[...o.types]:[],fileCount:((e=o==null?void 0:o.files)==null?void 0:e.length)||0,targetFrameSrc:this.wnd.location.href};return(i=this.comms)==null||i.send("content_protection",r),!1}else return!0},this.onContext=t=>{var e,i,o;if(this.isContextMenuEnabled){t.preventDefault();let r=this.wnd.getSelection(),s=(r==null?void 0:r.toString())||"",a=(i=s&&(r!=null&&r.rangeCount)?(e=r.getRangeAt(0))==null?void 0:e.getClientRects():null)==null?void 0:i[0],l={timestamp:Date.now(),clientX:t.clientX,clientY:t.clientY,...a&&{selectedText:{text:s,x:a.x,y:a.y,width:a.width,height:a.height}},targetFrameSrc:this.wnd.location.href};(o=this.comms)==null||o.send("context_menu",l)}},this.onPointerUp=this.onPointUp.bind(this),this.onPointerMove=this.onPointMove.bind(this),this.onPointerDown=this.onPointDown.bind(this),this.onClicker=this.onClick.bind(this)}addContextMenuPrevention(){this.isContextMenuEnabled||!this.wnd||(this.wnd.document.addEventListener("contextmenu",this.onContext),this.isContextMenuEnabled=!0)}removeContextMenuPrevention(){!this.isContextMenuEnabled||!this.wnd||(this.wnd.document.removeEventListener("contextmenu",this.onContext),this.isContextMenuEnabled=!1)}addDragAndDropPrevention(){this.isDragAndDropEnabled||!this.wnd||(this.wnd.document.addEventListener("dragstart",this.onDragStart),this.wnd.document.addEventListener("dragover",this.onDragOver),this.wnd.document.addEventListener("drop",this.onDrop),this.isDragAndDropEnabled=!0)}removeDragAndDropPrevention(){!this.isDragAndDropEnabled||!this.wnd||(this.wnd.document.removeEventListener("dragstart",this.onDragStart),this.wnd.document.removeEventListener("dragover",this.onDragOver),this.wnd.document.removeEventListener("drop",this.onDrop),this.isDragAndDropEnabled=!1)}enableKeyboardPeripherals(t=[]){this.disableKeyboardPeripherals();let e=i=>{var o;(o=this.comms)==null||o.send("keyboard_peripherals",i)};this.keyDownHandler=this.keyManager.createUnifiedHandler(this.wnd.location.href,t,e,this.wnd),this.wnd&&this.wnd.document.addEventListener("keydown",this.keyDownHandler,{capture:!0})}disableKeyboardPeripherals(){this.wnd&&this.keyDownHandler&&(this.wnd.document.removeEventListener("keydown",this.keyDownHandler,{capture:!0}),this.keyDownHandler=null)}addBulkCopyProtection(t={}){if(this.isBulkCopyProtectionEnabled||!this.wnd)return;let e=Vs,i=t?{...e,...t}:e;this.bulkCopyProtector=new no(this.wnd,i),this.wnd.document.addEventListener("copy",this.preventBulkCopy,!0),this.wnd.document.addEventListener("cut",this.preventBulkCopy,!0),this.isBulkCopyProtectionEnabled=!0}removeBulkCopyProtection(){var t;!this.isBulkCopyProtectionEnabled||!this.wnd||(this.wnd.document.removeEventListener("copy",this.preventBulkCopy,!0),this.wnd.document.removeEventListener("cut",this.preventBulkCopy,!0),(t=this.bulkCopyProtector)==null||t.destroy(),this.bulkCopyProtector=null,this.isBulkCopyProtectionEnabled=!1)}addSelectionMonitoring(t){if(this.isSelectionMonitoringEnabled||!this.wnd)return;let e=t||oo;this.selectionAnalyzer=new ro(e),this.wnd.document.addEventListener("selectionchange",this.handleSelection),this.isSelectionMonitoringEnabled=!0}removeSelectionMonitoring(){var t;!this.isSelectionMonitoringEnabled||!this.wnd||(this.wnd.document.removeEventListener("selectionchange",this.handleSelection),(t=this.selectionAnalyzer)==null||t.clear(),this.selectionAnalyzer=null,this.isSelectionMonitoringEnabled=!1)}onPointUp(t){var o,r,s,a,l;let e=this.wnd.getSelection();if(e&&((o=e.toString())==null?void 0:o.length)>0){let h=(r=e.getRangeAt(0))==null?void 0:r.getClientRects();if(!h||h.length===0)return;let c=h[0],d={text:e.toString(),x:c.x,y:c.y,width:c.width,height:c.height,targetFrameSrc:(a=(s=this.wnd)==null?void 0:s.location)==null?void 0:a.href};this.comms.send("text_selected",d)}if(this.pointerMoved){this.pointerMoved=!1;return}if(!(e!=null&&e.isCollapsed)||!t.isPrimary)return;let i=this.wnd.devicePixelRatio;t.preventDefault(),this.comms.send(t.pointerType==="touch"?"tap":"click",{defaultPrevented:t.defaultPrevented,x:t.clientX*i,y:t.clientY*i,targetFrameSrc:this.wnd.location.href,targetElement:t.target.outerHTML,interactiveElement:(l=bi(t.target))==null?void 0:l.outerHTML,cssSelector:this.wnd._readium_cssSelectorGenerator.getCssSelector(t.target),onContent:this.isOnContent(t.target,t.clientX,t.clientY)}),this.pointerMoved=!1}onPointMove(t){if(t.movementY!==void 0&&t.movementX!==void 0){(Math.abs(t.movementX)>1||Math.abs(t.movementY)>1)&&(this.pointerMoved=!0);return}this.pointerMoved=!0}onPointDown(){this.pointerMoved=!1}onClick(t){if(t.preventDefault(),!t.isTrusted){let e=new PointerEvent("pointerup",{isPrimary:!0,pointerType:"mouse",clientX:t.clientX,clientY:t.clientY});Object.defineProperty(e,"target",{writable:!1,value:t.target}),Object.defineProperty(e,"defaultPrevented",{writable:!1,value:t.defaultPrevented}),this.onPointUp(e)}}isOnContent(t,e,i){var r;if(t.closest("img, svg, video, audio, canvas, object"))return!0;let o=this.wnd.document.createRange();for(let s of Array.from(t.childNodes))if(!(s.nodeType!==Node.TEXT_NODE||!((r=s.textContent)!=null&&r.trim()))&&(o.selectNodeContents(s),Array.from(o.getClientRects()).some(a=>Pt(a,e,i,0))))return!0;return!1}pointedPiece({cssSelector:t,x:e,y:i,pieces:o}){let r=this.wnd.document.querySelector(t);if(!r)return-1;let s=this.wnd.document.createRange();s.selectNode(r);let a=this.wnd.devicePixelRatio,l=-1;for(let h=0;h<o.length;h++){let[c,d]=o[h],u=je(this.wnd.document,new G({href:this.wnd.location.href,type:"text/html",text:Ct.deserialize(c),locations:d?new ct({otherLocations:new Map([["cssSelector",d]])}):void 0}));if(!(!u||!u.intersectsNode(r))){if(ee(u,!1).some(m=>Pt(m,e/a,i/a,0)))return h;l===-1&&u.compareBoundaryPoints(Range.START_TO_START,s)<=0&&u.compareBoundaryPoints(Range.END_TO_END,s)>=0&&(l=h)}}return l}registerPointedPiece(){this.comms.register("pointed_piece",$e.moduleName,(t,e)=>{let i=t;this.comms.send("pointed_piece",{id:i.id,index:this.pointedPiece(i)}),e(!0)})}registerProtectionHandlers(){var t,e,i;(t=this.comms)==null||t.register("peripherals_protection",$e.moduleName,(o,r)=>{var a,l,h,c,d;let s=o;if(!this.configApplied){if(this.configApplied=!0,s.monitorSelection){let u=typeof s.monitorSelection=="boolean"?void 0:s.monitorSelection;this.addSelectionMonitoring(u),(a=this.comms)==null||a.log("Selection monitoring enabled")}typeof s.protectCopy=="object"?(this.addBulkCopyProtection({enabled:!0,...s.protectCopy}),(l=this.comms)==null||l.log("Copy protection enabled (limited)")):s.protectCopy===!0&&(this.addBulkCopyProtection({enabled:!0,maxSelectionPercent:0,minThreshold:0,absoluteMaxChars:0}),(h=this.comms)==null||h.log("Copy protection enabled")),s.disableContextMenu&&(this.addContextMenuPrevention(),(c=this.comms)==null||c.log("Context menu protection enabled")),s.disableDragAndDrop&&(this.addDragAndDropPrevention(),(d=this.comms)==null||d.log("Drag and drop protection enabled"))}r(!0)}),(e=this.comms)==null||e.register("unfocus",$e.moduleName,(o,r)=>{this.disableKeyboardPeripherals(),r(!0)}),(i=this.comms)==null||i.register("keyboard_peripherals",$e.moduleName,(o,r)=>{var a;let s=o;s&&s.length>0&&(this.enableKeyboardPeripherals(s),(a=this.comms)==null||a.log(`Keyboard peripherals enabled: ${s.map(l=>l.type).join(", ")}`)),r(!0)})}mount(t,e){return this.wnd=t,this.comms=e,this.registerProtectionHandlers(),this.registerPointedPiece(),t.document.addEventListener("pointerdown",this.onPointerDown),t.document.addEventListener("pointerup",this.onPointerUp),t.document.addEventListener("pointermove",this.onPointerMove),t.document.addEventListener("click",this.onClicker),e.log("Peripherals Mounted"),!0}unmount(t,e){return this.removeBulkCopyProtection(),this.removeSelectionMonitoring(),this.removeContextMenuPrevention(),this.removeDragAndDropPrevention(),this.disableKeyboardPeripherals(),this.cleanupCallbacks.forEach(i=>i()),this.cleanupCallbacks=[],t.document.removeEventListener("pointerdown",this.onPointerDown),t.document.removeEventListener("pointerup",this.onPointerUp),t.document.removeEventListener("pointermove",this.onPointerMove),t.document.removeEventListener("click",this.onClicker),e.unregisterAll($e.moduleName),this.configApplied=!1,e.log("Peripherals Unmounted"),!0}};ra.moduleName="peripherals";var sa=ra;p();p();var aa=class Mn extends yt{constructor(){super(...arguments),this.mediaPlayingCount=0,this.allAnimations=new Set}wndOnErr(t){var e;(e=this.comms)==null||e.send("error",{message:t.message,filename:t.filename,lineno:t.lineno,colno:t.colno})}unblock(t){var e;for(t._readium_blockEvents=!1;((e=t._readium_blockedEvents)==null?void 0:e.length)>0;){let i=t._readium_blockedEvents.shift();switch(i[0]){case 0:Reflect.apply(i[1],i[2],i[3]);break;case 1:let o=i[1],r=i[2];t.removeEventListener(o.type,t._readium_eventBlocker,!0);let s=new Event(o.type,{bubbles:o.bubbles,cancelable:o.cancelable});r?r.dispatchEvent(s):t.dispatchEvent(s);break}}}onMediaPlayEvent(){var t;this.mediaPlayingCount++,(t=this.comms)==null||t.send("media_play",this.mediaPlayingCount)}onMediaPauseEvent(){var t;this.mediaPlayingCount>0&&this.mediaPlayingCount--,(t=this.comms)==null||t.send("media_pause",this.mediaPlayingCount)}pauseAllMedia(t){let e=t.document.querySelectorAll("audio,video");for(let i=0;i<e.length;i++)e[i].pause()}mount(t,e){this.comms=e,t.addEventListener("error",this.wndOnErr,!1),Reflect.defineProperty(t.navigator,"epubReadingSystem",{value:{name:"readium-ts-toolkit",version:"2.10.1",hasFeature:(o,r="")=>{switch(o){case"dom-manipulation":return!0;case"layout-changes":return!0;case"touch-events":return!0;case"mouse-events":return!0;case"keyboard-events":return!0;case"spine-scripting":return!0;case"embedded-web-content":return!0;default:return!1}}},writable:!1}),"getAnimations"in t.document&&t.document.getAnimations().forEach(o=>{o.cancel(),this.allAnimations.add(o)}),e.register("activate",Mn.moduleName,(o,r)=>{this.allAnimations.forEach(s=>{s.cancel(),s.play()}),r(!0)}),e.register("unfocus",Mn.moduleName,(o,r)=>{this.pauseAllMedia(t),this.allAnimations.forEach(s=>s.pause()),r(!0)});let i=t.document.querySelectorAll("audio,video");for(let o=0;o<i.length;o++){let r=i[o];r.addEventListener("play",this.onMediaPlayEvent,{passive:!0}),r.addEventListener("pause",this.onMediaPauseEvent,{passive:!0})}return e.log("Setup Mounted"),!0}unmount(t,e){return t.removeEventListener("error",this.wndOnErr),t.removeEventListener("play",this.onMediaPlayEvent),t.removeEventListener("pause",this.onMediaPauseEvent),this.allAnimations.forEach(i=>i.cancel()),this.allAnimations.clear(),e.log("Setup Unmounted"),!0}};aa.moduleName="setup";var so=aa;var la="readium-viewport",ha=class be extends so{onViewportWidthChanged(t){let e=t.target;Qt(e,"--RS__viewportWidth",`${e.innerWidth}px`)}mount(t,e){if(!super.mount(t,e))return!1;let i=t.document.createElement("meta");return i.dataset.readium="true",i.setAttribute("name","viewport"),i.setAttribute("id",la),i.setAttribute("content","width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no"),t.document.head.appendChild(i),t.addEventListener("orientationchange",this.onViewportWidthChanged),t.addEventListener("resize",this.onViewportWidthChanged),this.onViewportWidthChanged({target:t}),e.register("get_properties",be.moduleName,(o,r)=>{_i(t),r(!0)}),e.register("update_properties",be.moduleName,(o,r)=>{o["--RS__viewportWidth"]=`${t.innerWidth}px`,io(t,o),r(!0)}),e.register("set_property",be.moduleName,(o,r)=>{let s=o;Qt(t,s[0],s[1]),r(!0)}),e.register("remove_property",be.moduleName,(o,r)=>{ye(t,o),r(!0)}),e.register("activate",be.moduleName,(o,r)=>{this.unblock(t),r(!0)}),e.log("ReflowableSetup Mounted"),!0}unmount(t,e){var i;return e.unregisterAll(be.moduleName),(i=t.document.head.querySelector(`#${la}`))==null||i.remove(),t.removeEventListener("orientationchange",this.onViewportWidthChanged),e.log("ReflowableSetup Unmounted"),super.unmount(t,e)}};ha.moduleName="reflowable_setup";var ca=ha;p();var da="readium-fixed-style",ua=class ie extends so{mount(t,e){if(!super.mount(t,e))return!1;t.navigator.epubReadingSystem&&(t.navigator.epubReadingSystem.layoutStyle="paginated");let i=t.document.createElement("style");return i.id=da,i.dataset.readium="true",i.textContent=`
        html, body {
            text-size-adjust: none;
            -ms-text-size-adjust: none;
            -webkit-text-size-adjust: none;
            -moz-text-size-adjust: none;

            /* Fight Safari pinches */
            touch-action: none !important;
            min-height: 100%;

            /*cursor: var() TODO*/
        }`,t.document.head.appendChild(i),e.register("set_property",ie.moduleName,(o,r)=>{let s=o;Qt(t,s[0],s[1]),r(!0)}),e.register("remove_property",ie.moduleName,(o,r)=>{ye(t,o),r(!0)}),e.register("first_visible_locator",ie.moduleName,(o,r)=>r(!1)),e.register("unfocus",ie.moduleName,(o,r)=>{W(t),r(!0)}),e.register(["focus","go_next","go_prev","go_id","go_end","go_start","go_text","go_progression"],ie.moduleName,(o,r)=>r(!0)),e.register("activate",ie.moduleName,(o,r)=>{this.unblock(t),r(!0)}),e.log("FixedSetup Mounted"),!0}unmount(t,e){var i;return e.unregisterAll(ie.moduleName),(i=t.document.getElementById(da))==null||i.remove(),e.log("FixedSetup Unmounted"),super.unmount(t,e)}};ua.moduleName="fixed_setup";var ma=ua;p();p();var pa=["div","span","p","br","hr","b","i","em","strong","s","u","mark","small","sub","sup","abbr","cite","code","data","dfn","kbd","q","samp","time","var","blockquote","pre","svg","g","path","circle","ellipse","rect","line","polygon","polyline","text","tspan","defs","use"],Ic=/^on/i,Hc=new Set(["href","src","action","formaction","xlink:href"]),Wc=/^\s*(javascript|data):/i;function ga(n,t){let e=n.document.createElement("div");if("Sanitizer"in n&&typeof e.setHTML=="function")try{let o=new n.Sanitizer({allowElements:pa});return e.setHTML(t,{sanitizer:o}),e.firstElementChild}catch{}let i=n.document.implementation.createHTMLDocument("");for(i.body.innerHTML=t,Bc(i.body,new Set(pa));i.body.firstChild;)e.appendChild(n.document.adoptNode(i.body.firstChild));return e.firstElementChild}function Bc(n,t){let e=Array.from(n.querySelectorAll("*")).reverse();for(let i of e){if(!t.has(i.localName)){i.replaceWith(...Array.from(i.childNodes));continue}for(let{name:o,value:r}of Array.from(i.attributes))(Ic.test(o)||Hc.has(o)&&Wc.test(r))&&i.removeAttribute(o)}}function Nn(n){switch(n){case L.Mask:return"rgba(255, 255, 255, 0.5)";case L.Highlight:case L.HighlightUnderline:return"#FFFF00";default:return"#FF0000"}}var L={Highlight:"highlight",HighlightUnderline:"highlightUnderline",Underline:"underline",Strikethrough:"strikethrough",Outline:"outline",TextColor:"textColor",Mask:"mask",Template:"template"},Sa=(n=>(n.Wrap="wrap",n.Viewport="viewport",n.Bounds="bounds",n.Page="page",n))(Sa||{}),ya=(n=>(n.Boxes="boxes",n.Bounds="bounds",n))(ya||{}),_a=(n=>(n.Solid="solid",n.Dashed="dashed",n.Dotted="dotted",n.Wavy="wavy",n))(_a||{}),jc=()=>"Highlight"in window,Dn=["IMG","IMAGE","AUDIO","VIDEO","SVG"],Gc=[...Dn,"IFRAME","OBJECT","EMBED","CANVAS"],Vc=new Set(["SUP","SUB","SMALL","CODE"]),$c=2,ao=1,fa=.1,Un=class n{constructor(t,e,i,o){this.wnd=t,this.comms=e,this.id=i,this.name=o,this.items=[],this.lastItemId=0,this.container=void 0,this._activatable=!1,this._hoverable=!1,this.hoveredItem=void 0,this.experimentalHighlights=!1,this._tintSubKeys=new Map,this._subKeyCounter=0,this.pendingWebkitReflow=null,this.maskSvg=void 0,this.shadowHost=void 0,this.shadowRoot=void 0,this.currentRender=0,this.pendingRender=new Set,this.maskFrame=0,jc()&&(this.experimentalHighlights=!0,this.notTextFlag=new Map),this.activationHandler=this.handleActivation.bind(this),this.wnd.document.addEventListener("pointerup",this.activationHandler),this.hoverHandler=this.handleHover.bind(this),this.wnd.document.addEventListener("pointermove",this.hoverHandler)}get activatable(){return this._activatable}set activatable(t){this._activatable=t}get hoverable(){return this._hoverable}get hasOverlayItems(){var t,e;return!this.experimentalHighlights||((e=(t=this.notTextFlag)==null?void 0:t.size)!=null?e:0)>0}set hoverable(t){if(this._hoverable=t,!t&&this.hoveredItem){let e=this.hoveredItem.range.getBoundingClientRect(),i=this.wnd.devicePixelRatio;this.comms.send("decoration_pointer_leave",{decorationId:this.hoveredItem.decoration.id,group:this.name,rect:{top:e.top*i,left:e.left*i,width:e.width*i,height:e.height*i}}),this.hoveredItem=void 0}}add(t){var s,a,l,h,c,d,u;let e=`${this.id}-${this.lastItemId++}`,i=je(this.wnd.document,t.locator);if(!i){this.comms.log("Can't locate DOM range for decoration",t);return}let o=i.commonAncestorContainer;if(o.nodeType!==Node.TEXT_NODE&&this.experimentalHighlights&&(Dn.includes(o.nodeName.toUpperCase())&&((s=this.notTextFlag)==null||s.set(e,!0)),i.cloneContents().querySelector(Dn.join(", ").toLowerCase())&&((a=this.notTextFlag)==null||a.set(e,!0)),(((l=o.textContent)==null?void 0:l.trim())||"").length===0&&((h=this.notTextFlag)==null||h.set(e,!0))),this.experimentalHighlights&&!((c=this.notTextFlag)!=null&&c.has(e))){let m=g=>{var b;for(;g&&g.nodeType===Node.ELEMENT_NODE;){if((b=g.namespaceURI)!=null&&b.includes("svg"))return!0;g=g.parentNode}return!1};(m(i.startContainer)||m(i.endContainer))&&((d=this.notTextFlag)==null||d.set(e,!0))}if(this.experimentalHighlights){let{type:m}=t.style,{layout:g,width:b,expand:S,thickness:y,lineStyle:f}=t.style;m!==L.TextColor&&(m===L.Outline||m===L.Template||m===L.Mask||g!==void 0&&g!=="boxes"||b!==void 0&&b!=="wrap"||S||et.UA.WebKit&&m!==L.Highlight&&(y!==void 0||f&&f!=="solid")||et.UA.Blink&&Tn(this.wnd)&&(m===L.Underline||m===L.HighlightUnderline))&&((u=this.notTextFlag)==null||u.set(e,!0))}let r={decoration:t,id:e,range:i,hitRects:[],clickableElements:void 0,container:void 0};this.items.push(r),this.layout(r),r.hitRects=this.clientRectsToDocCoords(ee(r.range,!1,!1,this.scaledExpand(r.decoration.style)+this.hitGap())),this.renderLayout([r])}remove(t){var r,s,a,l;let e=this.items.findIndex(h=>h.decoration.id===t);if(e<0)return;let i=this.items[e],o=((r=i.decoration.style)==null?void 0:r.type)===L.Mask;if(this.items.splice(e,1),i.clickableElements=void 0,i.container&&(i.container.remove(),i.container=void 0),this.experimentalHighlights&&!((s=this.notTextFlag)!=null&&s.has(i.id))&&i.highlightSubKey){let h=this.wnd.CSS.highlights;(a=h.get(i.highlightSubKey))==null||a.delete(i.range),this.items.some(d=>d.highlightSubKey===i.highlightSubKey)||h.delete(i.highlightSubKey);let c=this.wnd.document.getElementById(`${this.id}-style`);c&&this._rebuildHighlightStylesheet(c),this.scheduleWebkitRepaintFix([i])}(l=this.notTextFlag)==null||l.delete(i.id),this.hoveredItem===i&&(this.hoveredItem=void 0),o&&this.scheduleMaskUpdate()}update(t){this.remove(t.id),this.add(t)}clear(){var t;this.experimentalHighlights&&this.scheduleWebkitRepaintFix(this.items),this.clearContainer(),this.items.length=0,(t=this.notTextFlag)==null||t.clear(),this.hoveredItem=void 0,this.maskSvg?this.scheduleMaskUpdate():this.removeShadowHost()}destroy(){var t;this.clear(),this.wnd.cancelAnimationFrame(this.maskFrame),this.maskFrame=0,(t=this.maskSvg)==null||t.remove(),this.maskSvg=void 0,this.removeShadowHost(),this.wnd.document.removeEventListener("pointerup",this.activationHandler),this.wnd.document.removeEventListener("pointermove",this.hoverHandler)}isWebkitRepaintProne(t){let e=this.wnd.getComputedStyle(t);if(Vc.has(t.tagName.toUpperCase())||e.display==="inline-block"||e.verticalAlign!=="baseline")return!0;let i=t.parentElement?this.wnd.getComputedStyle(t.parentElement):null;return!!i&&parseFloat(e.fontSize)!==parseFloat(i.fontSize)}findWebkitRepaintProneElement(t){let e=t.startContainer.nodeType===Node.ELEMENT_NODE?t.startContainer:t.startContainer.parentElement;for(;e;){if(this.isWebkitRepaintProne(e))return e;if(this.wnd.getComputedStyle(e).display!=="inline")break;e=e.parentElement}let i=t.commonAncestorContainer,o=i.nodeType===Node.ELEMENT_NODE?i:i.parentElement;if(!o)return null;let r=this.wnd.document.createTreeWalker(o,NodeFilter.SHOW_ELEMENT,s=>t.intersectsNode(s)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT);for(let s=r.nextNode();s;s=r.nextNode())if(this.isWebkitRepaintProne(s))return s;return null}forceWebkitBlockReflow(t){let e=t;for(;e;){let s=this.wnd.getComputedStyle(e).display;if(s!=="inline"&&s!=="inline-block")break;e=e.parentElement}if(!e||!e.isConnected)return;let i=e,o=i.style.getPropertyValue("transform"),r=i.style.getPropertyPriority("transform");i.style.setProperty("transform","translateZ(0.001px)","important"),i.offsetHeight,i.style.setProperty("transform","translateZ(0px)","important"),i.offsetHeight,o?i.style.setProperty("transform",o,r):i.style.removeProperty("transform")}scheduleWebkitRepaintFix(t){var e;if(et.UA.WebKit)for(let i of t){if((e=this.notTextFlag)!=null&&e.has(i.id)||!i.highlightSubKey)continue;let o=this.findWebkitRepaintProneElement(i.range);o&&this.queueWebkitReflow(o)}}queueWebkitReflow(t){this.pendingWebkitReflow||(this.pendingWebkitReflow=new Set,this.wnd.requestAnimationFrame(()=>{let e=this.pendingWebkitReflow;this.pendingWebkitReflow=null,e==null||e.forEach(i=>this.forceWebkitBlockReflow(i))})),this.pendingWebkitReflow.add(t)}clientRectsToDocCoords(t,e=Se(this.wnd)){let i=e.xDocOffset,o=e.yDocOffset;return i===0&&o===0?t:t.map(r=>({left:r.left+i,top:r.top+o,right:r.right+i,bottom:r.bottom+o,width:r.width,height:r.height}))}pointerToDocCoords(t){let e=Se(this.wnd);return{docX:t.clientX+e.xDocOffset,docY:t.clientY+e.yDocOffset}}effectiveZoom(){if(!et.UA.Blink)return 1;let t=parseFloat(this.wnd.getComputedStyle(this.wnd.document.documentElement).zoom),e=parseFloat(this.wnd.getComputedStyle(this.wnd.document.body).zoom);return(t||1)*(e||1)}hitGap(){return 2*this.effectiveZoom()}scaledExpand(t){var e;return((e=t.expand)!=null?e:0)*this.effectiveZoom()}handleActivation(t){var r;if(!this._activatable)return;let{docX:e,docY:i}=this.pointerToDocCoords(t),o=this.wnd.devicePixelRatio;for(let s of this.items){let a;if(s.decoration.style.type===L.Template)for(let l of(r=s.clickableElements)!=null?r:[]){let h=l.getBoundingClientRect();if(Pt(h,t.clientX,t.clientY,0)){a=h;break}}else for(let l of s.hitRects)if(Pt(l,e,i,0)){a=s.range.getBoundingClientRect();break}if(a){this.comms.send("decoration_activated",{decorationId:s.decoration.id,group:this.name,rect:{top:a.top*o,left:a.left*o,width:a.width*o,height:a.height*o},point:{x:t.clientX*o,y:t.clientY*o}});return}}}handleHover(t){var a;if(!this._hoverable)return;let{docX:e,docY:i}=this.pointerToDocCoords(t),o=this.wnd.devicePixelRatio,r,s;for(let l of this.items){if(l.decoration.style.type===L.Template)for(let h of(a=l.clickableElements)!=null?a:[]){let c=h.getBoundingClientRect();if(Pt(c,t.clientX,t.clientY,0)){r=l,s=c;break}}else for(let h of l.hitRects)if(Pt(h,e,i,0)){r=l,s=l.range.getBoundingClientRect();break}if(r)break}if(r!==this.hoveredItem){if(this.hoveredItem){let l=this.hoveredItem.range.commonAncestorContainer.isConnected?this.hoveredItem.range.getBoundingClientRect():null;this.comms.send("decoration_pointer_leave",{decorationId:this.hoveredItem.decoration.id,group:this.name,rect:l?{top:l.top*o,left:l.left*o,width:l.width*o,height:l.height*o}:void 0,point:{x:t.clientX*o,y:t.clientY*o}})}this.hoveredItem=r,r&&s&&this.comms.send("decoration_pointer_enter",{decorationId:r.decoration.id,group:this.name,rect:{top:s.top*o,left:s.left*o,width:s.width*o,height:s.height*o},point:{x:t.clientX*o,y:t.clientY*o}})}}requestLayout(){this.wnd.cancelAnimationFrame(this.currentRender),this.clearContainer(),this.wnd.document.fonts.ready.then(()=>{this.currentRender=this.wnd.requestAnimationFrame(()=>{this.items.forEach(t=>{this.layout(t),t.hitRects=this.clientRectsToDocCoords(ee(t.range,!1,!1,this.scaledExpand(t.decoration.style)+this.hitGap()))}),this.renderLayout(this.items)})})}repositionOverlays(){let t=[],e=Se(this.wnd),i;this.items.forEach(o=>{var r,s,a;if(!(this.experimentalHighlights&&!((r=this.notTextFlag)!=null&&r.has(o.id)))){if(((s=o.decoration.style)==null?void 0:s.type)===L.Mask){this.scheduleMaskUpdate();return}this.repositionItem(o,i!=null?i:i=this.overlayContext())||((a=o.container)==null||a.remove(),this.layout(o),t.push(o)),o.hitRects=this.clientRectsToDocCoords(ee(o.range,!1,!1,this.scaledExpand(o.decoration.style)+this.hitGap()),e)}}),t.length&&this.renderLayout(t)}experimentalLayout(t){var y,f,w,R;let e=this.requireContainer(!0),i=this.wnd.CSS.highlights,o=t.decoration.style,r=(y=o.type)!=null?y:L.Highlight,s=(f=o.tint)!=null?f:Nn(r),a=o.width,l=o.layout,h=this._getSubKey(r,s,o.thickness,o.lineStyle);t.highlightSubKey&&((w=i.get(t.highlightSubKey))==null||w.delete(t.range),t.highlightSubKey!==h&&!this.items.some(v=>v!==t&&v.highlightSubKey===t.highlightSubKey)&&i.delete(t.highlightSubKey)),t.highlightSubKey=h;let c;i.has(h)?c=i.get(h):(c=new this.wnd.Highlight,i.set(h,c));let d=(v,C)=>{var z,k,T;return(T=(k=(z=this.wnd.document).caretPositionFromPoint)==null?void 0:k.call(z,v,C))!=null?T:null};if(r===L.TextColor&&(l==="bounds"||a==="bounds"||a==="page")){let v=Se(this.wnd);if(v.isVertical)console.warn("Vertical writing detected: caretPositionFromPoint has known bugs, falling back to original range"),c.add(t.range);else{let C=t.range.getBoundingClientRect(),z,k;a==="page"?(z=Math.floor(v.inlineStart(C)/v.pageInlineSize)*v.pageInlineSize,k=v.pageInlineSize):(z=v.inlineStart(C),k=v.inlineSize(C));let T=t.range.commonAncestorContainer,O=T.nodeType===Node.ELEMENT_NODE?T:T.parentElement,x=Fn(this.wnd,O),[P,A]=x?[z+k,z]:[z,z+k],U=d(P,v.blockStart(C)+1),M=d(A,v.blockStart(C)+v.blockSize(C)-1),N=this.wnd.document.createRange();U&&M&&(N.setStart(U.offsetNode,U.offset),N.comparePoint(M.offsetNode,M.offset)<0?N.setStart(M.offsetNode,M.offset):N.setEnd(M.offsetNode,M.offset)),N.collapsed?c.add(t.range):(c.add(N),t.range=N)}}else c.add(t.range);let u=this.getBackgroundColor(),m=o.enforceContrast!==!1?jt(s,u):s,g=o.thickness===void 0?`${fa}em`:`${o.thickness}px`,b=(R=o.lineStyle)!=null?R:"solid",S;switch(r){case L.Underline:S=`::highlight(${h}) {
                    text-decoration: underline;
                    text-decoration-color: ${m};
                    text-decoration-thickness: ${g};
                    text-decoration-style: ${b};
                }`;break;case L.Strikethrough:S=`::highlight(${h}) {
                    text-decoration: line-through;
                    text-decoration-color: ${m};
                    text-decoration-thickness: ${g};
                    text-decoration-style: ${b};
                }`;break;case L.Outline:S=`::highlight(${h}) {
                    outline: 2px solid ${m};
                    outline-offset: 1px;
                }`;break;case L.TextColor:{let v=o.thickness?o.thickness/2:0,[C,z]=Se(this.wnd).isVertical?[0,v]:[v,0];S=`::highlight(${h}) {
                    color: ${m};${v?`
                    text-shadow: ${C}px ${z}px 0 ${m}, ${-C}px ${-z}px 0 ${m};`:""}
                }`;break}case L.HighlightUnderline:{let{r:v,g:C,b:z}=Bt(m),k=`rgba(${v}, ${C}, ${z}, 0.3)`;S=`::highlight(${h}) {
                    color: ${Wi(k,u)};
                    background-color: ${k};
                    text-decoration: underline;
                    text-decoration-color: ${m};
                    text-decoration-thickness: ${g};
                    text-decoration-style: ${b};
                }`;break}case L.Highlight:default:S=`::highlight(${h}) {
                    color: ${Wi(m,u)};
                    background-color: ${m};
                }`}t.highlightCSS=S,this._rebuildHighlightStylesheet(e)}_getSubKey(t,e,i,o){let r=`${t}::${e}::${i!=null?i:""}::${o!=null?o:""}`,s=this._tintSubKeys.get(r);return s||(s=`${this.id}--${this._subKeyCounter++}`,this._tintSubKeys.set(r,s)),s}_rebuildHighlightStylesheet(t){let e=new Set,i=[];for(let o of this.items)o.highlightSubKey&&o.highlightCSS&&!e.has(o.highlightSubKey)&&(e.add(o.highlightSubKey),i.push(o.highlightCSS));t.innerHTML=i.join(`
`)}positionElement(t,e,i,o,r,s,a=0){let[l,h,c,d]=this.overlayBox(t,e,r,s,a);e.applyPosition(o,l,h,c,d,i)}overlayBox(t,e,i,o,r=0){var l,h;let s=(h=(l=t.decoration)==null?void 0:l.style)==null?void 0:h.width,a=i;switch(s){case"viewport":return[Math.floor(e.inlineStart(a)/e.viewportInlineSize)*e.viewportInlineSize+e.inlineScrollOffset+r,e.blockStart(a)+e.blockScrollOffset,e.viewportInlineSize-2*r,e.blockSize(a)];case"page":return[Math.floor(e.inlineStart(a)/e.pageInlineSize)*e.pageInlineSize+e.inlineScrollOffset+r,e.blockStart(a)+e.blockScrollOffset,e.pageInlineSize-2*r,e.blockSize(a)];case"bounds":return[e.inlineStart(o)+e.inlineScrollOffset,e.blockStart(a)+e.blockScrollOffset,e.inlineSize(o),e.blockSize(a)];default:return[e.inlineStart(a)+e.inlineScrollOffset,e.blockStart(a)+e.blockScrollOffset,e.inlineSize(a),e.blockSize(a)]}}static replacedContentRects(t){let e=t.commonAncestorContainer;return e.nodeType!==Node.ELEMENT_NODE?[]:Array.from(e.querySelectorAll(Gc.join(", ").toLowerCase())).filter(i=>t.intersectsNode(i)).flatMap(i=>Array.from(i.getClientRects())).map(({left:i,right:o,top:r,bottom:s,width:a,height:l})=>({left:i,right:o,top:r,bottom:s,width:a,height:l}))}static mergeLineRects(t,e,i){let o=h=>e.blockStart(h)+e.blockSize(h),r=h=>e.inlineStart(h)+e.inlineSize(h),s=(h,c)=>Math.min(o(h),o(c))-Math.max(e.blockStart(h),e.blockStart(c))>Math.min(e.blockSize(h),e.blockSize(c))/2&&Math.max(e.inlineStart(h),e.inlineStart(c))-Math.min(r(h),r(c))<=1,a=(h,c,d)=>{let u=Math.min(h.left,c.left),m=Math.max(h.right,c.right),g=Math.min(h.top,c.top),b=Math.max(h.bottom,c.bottom),S={left:u,right:m,top:g,bottom:b,width:m-u,height:b-g};return d?e.isVertical?{...S,left:d.left,right:d.right,width:d.width}:{...S,top:d.top,bottom:d.bottom,height:d.height}:S},l=[];for(let h of[...t].sort((c,d)=>e.inlineStart(c)-e.inlineStart(d))){let c=l.findIndex(u=>s(h,u));if(c<0){l.push(h);continue}let d=l[c];l[c]=a(d,h,i&&(e.blockSize(h)>e.blockSize(d)?h:d))}for(let h of i!=null?i:[]){let c=l.findIndex(d=>s(h,d));c<0?l.push(h):l[c]=a(l[c],h,l[c])}return l}static isShapeOutline(t){let{lineStyle:e}=t;return t.type===L.Outline&&(t.layout!=="bounds"||e==="wavy"||n.drawsOwnDots(e))}static drawsOwnDots(t){return!!et.UA.WebKit&&t==="dotted"}static dotImage(t,e){let i=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${e?"0 0 1 2":"0 0 2 1"}" preserveAspectRatio="none"><circle cx="0.5" cy="0.5" r="0.5" fill="${t}"/></svg>`;return`url('data:image/svg+xml,${encodeURIComponent(i)}')`}static waveImage(t,e){let[i,o]=e?["0 0 3 6","M1.5 0Q-0.5 1.5 1.5 3T1.5 6"]:["0 0 6 3","M0 1.5Q1.5 -0.5 3 1.5T6 1.5"],r=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${i}" preserveAspectRatio="none"><path d="${o}" fill="none" stroke="${t}" stroke-width="1" stroke-linecap="round"/></svg>`;return`url('data:image/svg+xml,${encodeURIComponent(r)}')`}underlineDeclarations(t,e,i,o,r,s){let a=this.underlineWidth(t),[l,h]=e.isVertical?["right","left"]:["bottom","top"],c=r?[l,h]:[l],d=["box-sizing: content-box !important"],u=o==="wavy";if(!u&&!n.drawsOwnDots(o))return d.push(...c.map(f=>`border-${f}: ${a} ${o} ${i} !important`)),r&&d.push(`margin-${h}: calc(-1 * ${a}) !important`),d.push(s?`background: ${s} padding-box !important`:"background-color: transparent !important"),d;let m=u?`calc(3 * ${a})`:a,g=`calc(${u?6:2} * ${a})`;d.push(...c.map(f=>`padding-${f}: ${m} !important`)),r&&d.push(`margin-${h}: calc(-1 * ${m}) !important`);let b=u?n.waveImage(i,e.isVertical):n.dotImage(i,e.isVertical),S=c.map(f=>({position:e.isVertical?`${f} top`:`left ${f}`,size:e.isVertical?`${m} ${g}`:`${g} ${m}`,repeat:e.isVertical?"no-repeat round":"round no-repeat"})),y=s?[...S.map(f=>({...f,image:b,clip:"border-box"})),{image:`linear-gradient(${s}, ${s})`,position:"0 0",size:"auto",repeat:"no-repeat",clip:"content-box"}]:S.map(f=>({...f,image:b,clip:"border-box"}));return d.push(`background-image: ${y.map(f=>f.image).join(", ")} !important`,`background-position: ${y.map(f=>f.position).join(", ")} !important`,`background-size: ${y.map(f=>f.size).join(", ")} !important`,`background-repeat: ${y.map(f=>f.repeat).join(", ")} !important`,`background-clip: ${y.map(f=>f.clip).join(", ")} !important`,"background-color: transparent !important"),d}underlineWidth(t){let{thickness:e}=t.decoration.style;return e===void 0?`${fa}em`:`${e}px`}sizeStrikethroughPattern(t,e,i,o,r){let{type:s,layout:a,lineStyle:l}=t.decoration.style;if(s!==L.Strikethrough||a==="bounds"||!l||l==="solid")return;let h=e.blockSize(r)*i;if(l==="wavy"||n.drawsOwnDots(l)){o.style.setProperty("background-size",e.isVertical?`${h}px ${h*2}px`:`${h*2}px ${h}px`,"important");return}o.style.setProperty(e.isVertical?"border-left-width":"border-top-width",`${h}px`,"important")}outlineMetrics(t){var s;let e=t.decoration.style;if(e.type!==L.Outline)return{stroke:0,wave:0,inset:0};let i=(s=e.thickness)!=null?s:$c,o=e.lineStyle==="wavy"?i:0,r=e.width==="page"||e.width==="viewport"?(i+ao+o*2)*this.effectiveZoom():0;return{stroke:i,wave:o,inset:r}}outlinePath(t,e,i,o,r,s,a,l){let h=e.isVertical&&!e.isVertLR?-1:1,c=o.map(m=>{let[g,b,S,y]=this.overlayBox(t,e,m,r,s).map(R=>R*i),f=g+S,w=b+y;return h===1?{i0:g,i1:f,b0:b,b1:w}:{i0:g,i1:f,b0:-w,b1:-b}}).sort((m,g)=>m.b0-g.b0),d=[];for(let m of c){let g=d.find(b=>{let S=b[b.length-1];return m.b0>S.b0&&m.b0-S.b1<Math.min(S.b1-S.b0,m.b1-m.b0)&&m.i0<S.i1&&m.i1>S.i0});g?g.push(m):d.push([m])}let u=(m,g)=>e.isVertical?`${g*h} ${m}`:`${m} ${g}`;return d.map(m=>{let g=m.length-1,b=f=>(m[f].b1+m[f+1].b0)/2,S=(f,w)=>b(f)+Math.sign(w)*a,y=[[m[0].i1+a,m[0].b0-a]];for(let f=0;f<g;f++){let w=S(f,m[f].i1-m[f+1].i1);y.push([m[f].i1+a,w],[m[f+1].i1+a,w])}y.push([m[g].i1+a,m[g].b1+a],[m[g].i0-a,m[g].b1+a]);for(let f=g-1;f>=0;f--){let w=S(f,m[f+1].i0-m[f].i0);y.push([m[f+1].i0-a,w],[m[f].i0-a,w])}return y.push([m[0].i0-a,m[0].b0-a]),l?n.wavyPolygon(y,l,u):`M${y.map(([f,w])=>u(f,w)).join(" L")} Z`}).join(" ")}static wavyPolygon(t,e,i){let o=e*3,r=`M${i(...t[0])}`;return t.forEach(([s,a],l)=>{let[h,c]=t[(l+1)%t.length],d=Math.hypot(h-s,c-a);if(d<o){r+=` L${i(h,c)}`;return}let u=Math.round(d/o),[m,g]=[(h-s)/u,(c-a)/u],[b,S]=[-(c-a)/d*e*2,(h-s)/d*e*2];for(let y=0;y<u;y++){let f=y%2?-1:1;r+=` Q${i(s+m*(y+.5)+b*f,a+g*(y+.5)+S*f)} ${i(s+m*(y+1),a+g*(y+1))}`}}),`${r} Z`}computeOverlayRects(t,e,i,o){var g,b;if(((b=(g=t.decoration)==null?void 0:g.style)==null?void 0:b.layout)==="bounds")return[o?{left:i.left-o,right:i.right+o,top:i.top-o,bottom:i.bottom+o,width:i.width+o*2,height:i.height+o*2}:i];let r=t.decoration.style,s=r.type,a=s===L.Underline||s===L.Strikethrough,l=s===L.Strikethrough,h=l?r.thickness:void 0,c=l&&r.lineStyle==="wavy",d=t.range,u=[];if(a||s===L.Outline||s===L.HighlightUnderline){let S=ea(t.range,["rt","rp"]);S.length&&(u=n.replacedContentRects(t.range),d=a?S:[...S,...u])}let m=n.mergeLineRects(ee(d,!0,e.isVertical,a?0:o),e,a?u:void 0);return m=m.sort((S,y)=>e.isVertical?(e.isVertLR?1:-1)*(S.left-y.left):S.top-y.top),m.map(S=>{let y=S;if(l){let f=h!==void 0?h*this.effectiveZoom():e.blockSize(S)*.1,w=c?f*3:f,R=e.blockStart(S)+e.blockSize(S)/2-w/2;y=e.isVertical?{left:R,right:R+w,top:S.top,bottom:S.bottom,width:w,height:S.height}:{top:R,bottom:R+w,left:S.left,right:S.right,height:w,width:S.width}}if(o&&a){let f=o,w=l?0:o,[R,v]=e.isVertical?[w,f]:[f,w];y={left:y.left-R,right:y.right+R,top:y.top-v,bottom:y.bottom+v,width:y.width+R*2,height:y.height+v*2}}return y})}repositionItem(t,e){var d,u;if(!t.container)return!0;let i=t.decoration.style;if(i.type!==L.Template){let m=(d=i.type)!=null?d:L.Highlight;if(m===L.TextColor||m===L.Mask)return!0}let o=1/this.effectiveZoom(),r=this.scaledExpand(i),s=t.range.getBoundingClientRect(),a=this.outlineMetrics(t),l=a.inset,h=this.computeOverlayRects(t,e,s,r);if(n.isShapeOutline(i))return(u=t.container.querySelector("path"))==null||u.setAttribute("d",this.outlinePath(t,e,o,h,s,l,ao+a.stroke/2+a.wave,a.wave)),!0;let c=Array.from(t.container.children);return c.length!==h.length?!1:(c.forEach((m,g)=>{this.positionElement(t,e,o,m,h[g],s,l),this.sizeStrikethroughPattern(t,e,o,m,h[g])}),!0)}layout(t){var u,m,g,b;if(this.experimentalHighlights&&!((u=this.notTextFlag)!=null&&u.has(t.id)))return this.experimentalLayout(t);let e=this.wnd.document.createElement("div");e.setAttribute("id",t.id),e.dataset.highlightId=t.decoration.id,e.style.setProperty("pointer-events","none");let i=this.overlayContext(),o=1/this.effectiveZoom(),r=this.scaledExpand(t.decoration.style),s=t.range.getBoundingClientRect(),a=t.decoration.style,l=this.outlineMetrics(t),h=l.inset,c;if(a.type===L.Template){a.stylesheet&&this.injectCustomStylesheet(a.stylesheet);let S=ga(this.wnd,a.element);if(!S){t.container=e,t.clickableElements=[];return}S.style.setProperty("pointer-events","none"),c=S}else{let S=a,y=(m=S.type)!=null?m:L.Highlight,f=(g=S.tint)!=null?g:Nn(y);if(y===L.TextColor){t.container=e,t.clickableElements=[];return}if(y===L.Mask){t.container=e,t.clickableElements=[],this.scheduleMaskUpdate();return}let w=this.getCurrentDarkMode(),R=this.getBackgroundColor(),v=S.enforceContrast!==!1,C=(b=S.lineStyle)!=null?b:"solid";if(n.isShapeOutline(S)){let T="http://www.w3.org/2000/svg",O=this.wnd.document.createElementNS(T,"svg");O.dataset.readium="true",O.style.cssText=`position:absolute;top:0;left:0;width:1px;height:1px;overflow:visible;writing-mode:horizontal-tb;pointer-events:none;z-index:${to}`;let x=this.wnd.document.createElementNS(T,"path");x.setAttribute("fill","none"),x.setAttribute("stroke",v?jt(f,R):f),x.setAttribute("stroke-width",String(l.stroke)),C==="dashed"&&x.setAttribute("stroke-dasharray",`${l.stroke*3} ${l.stroke*2}`),C==="dotted"&&(x.setAttribute("stroke-dasharray",`0 ${l.stroke*2}`),x.setAttribute("stroke-linecap","round")),x.setAttribute("d",this.outlinePath(t,i,o,this.computeOverlayRects(t,i,s,r),s,h,ao+l.stroke/2+l.wave,l.wave)),O.append(x),e.append(O),t.container=e,t.clickableElements=[];return}let z=(()=>{var T;switch(y){case L.Underline:{let x=v?jt(f,R):f,P=S.layout==="bounds";return this.underlineDeclarations(t,i,x,C,P).join("; ")}case L.Strikethrough:{let x=v?jt(f,R):f;if(S.layout==="bounds"){let P=(T=S.thickness)!=null?T:1,[A,U]=C==="dashed"?[P*3,P*5]:C==="dotted"?[P,P*2]:[],M=A?`repeating-linear-gradient(45deg, black 0 ${A}px, transparent ${A}px ${U}px)`:null;return[`background: repeating-linear-gradient(-45deg, transparent, transparent 19px, ${x} 19px, ${x} ${19+P}px) !important`,"background-color: transparent !important",M?`-webkit-mask-image: ${M} !important`:null,M?`mask-image: ${M} !important`:null,"box-sizing: border-box !important"].filter(Boolean).join("; ")}return C==="wavy"||n.drawsOwnDots(C)?[`background-image: ${C==="wavy"?n.waveImage(x,i.isVertical):n.dotImage(x,i.isVertical)} !important`,`background-repeat: ${i.isVertical?"no-repeat round":"round no-repeat"} !important`,"background-color: transparent !important","box-sizing: border-box !important"].join("; "):C!=="solid"?[`${i.isVertical?"border-left":"border-top"}: 0 ${C} ${x} !important`,"background-color: transparent !important","box-sizing: border-box !important"].join("; "):[`background-color: ${x} !important`,"box-sizing: border-box !important"].join("; ")}case L.Outline:let O=v?jt(f,R):f;return[`outline: ${l.stroke}px ${C} ${O} !important`,`outline-offset: ${ao}px !important`,"background-color: transparent !important","box-sizing: border-box !important"].join("; ");case L.HighlightUnderline:{let x=v?jt(f,R):f,{r:P,g:A,b:U}=Bt(x),M=`rgba(${P}, ${A}, ${U}, 0.3)`,N=S.layout==="bounds";return this.underlineDeclarations(t,i,x,C,N,M).join("; ")}case L.Highlight:default:return[`background-color: ${v?jt(f,R):f} !important`,`mix-blend-mode: ${w?"exclusion":"multiply"} !important`,"opacity: 1 !important","box-sizing: border-box !important","transform: translateZ(0) !important"].join("; ")}})(),k=this.wnd.document.createElement("template");k.innerHTML=`<div data-readium="true" class="readium-${y}" style="${z}"></div>`.trim(),c=k.content.firstElementChild}let d=this.computeOverlayRects(t,i,s,r);for(let S of d){let y=c.cloneNode(!0);y.style.setProperty("pointer-events","none"),this.positionElement(t,i,o,y,S,s,h),this.sizeStrikethroughPattern(t,i,o,y,S),e.append(y)}t.container=e,t.clickableElements=Array.from(e.querySelectorAll("[data-activable='1']")),t.clickableElements.length||(t.clickableElements=Array.from(e.children))}renderLayout(t){t.forEach(e=>this.pendingRender.add(e)),this.wnd.cancelAnimationFrame(this.currentRender),this.currentRender=this.wnd.requestAnimationFrame(()=>{t=Array.from(this.pendingRender).filter(e=>{var i;return this.items.includes(e)&&(!this.experimentalHighlights||!!((i=this.notTextFlag)!=null&&i.has(e.id)))}),this.pendingRender.clear(),t.length!==0&&this.requireContainer().append(...t.map(e=>e.container).filter(e=>!!e))})}requireShadowHost(){return(!this.shadowHost||!this.shadowRoot)&&(this.shadowHost=this.wnd.document.createElement("div"),this.shadowHost.style.cssText="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none",this.wnd.document.body.appendChild(this.shadowHost),this.shadowRoot=this.shadowHost.attachShadow({mode:"open"})),this.shadowHost}overlayContext(){return Se(this.wnd,this.requireShadowHost())}requireContainer(t=!1){if(t){let e;return this.wnd.document.getElementById(`${this.id}-style`)?e=this.wnd.document.getElementById(`${this.id}-style`):(e=this.wnd.document.createElement("style"),e.dataset.readium="true",e.id=`${this.id}-style`,this.wnd.document.head.appendChild(e)),e}return this.container||(this.requireShadowHost(),this.container=this.wnd.document.createElement("div"),this.container.setAttribute("id",this.id),this.container.dataset.group=this.name,this.container.dataset.readium="true",this.container.style.setProperty("pointer-events","none"),this.container.style.display="contents",this.shadowRoot.appendChild(this.container)),this.container}getCurrentDarkMode(){return Ln(this.wnd,"--USER__appearance")==="readium-night-on"||Hi(this.getBackgroundColor())}getBackgroundColor(){return Ln(this.wnd,"--USER__backgroundColor")||this.wnd.getComputedStyle(this.wnd.document.documentElement).getPropertyValue("background-color")}scheduleMaskUpdate(){this.maskFrame||(this.maskFrame=this.wnd.requestAnimationFrame(()=>{this.maskFrame=0,this.updateSharedMask()}))}removeShadowHost(){var t;(t=this.shadowHost)==null||t.remove(),this.shadowHost=void 0,this.shadowRoot=void 0}opaqueBackgroundColor(){let t=this.getBackgroundColor().trim();return!t||t==="transparent"||/^rgba\(.*,\s*(0|0?\.0+)\s*\)$|\/\s*(0|0?\.0+)\s*\)$/.test(t)?void 0:t}updateSharedMask(){var y,f,w;let t=this.items.filter(R=>{var v;return((v=R.decoration.style)==null?void 0:v.type)===L.Mask});if(t.length===0){this.maskSvg&&(this.maskSvg.remove(),this.maskSvg=void 0),this.container||this.removeShadowHost();return}this.maskSvg&&(this.maskSvg.style.display="none");let e=this.overlayContext(),i=1/this.effectiveZoom(),o=this.wnd.document.documentElement,r=o.scrollWidth*i,s=o.scrollHeight*i,a=this.wnd.document.scrollingElement,l=(((e.isVertical?!e.isVertLR:Fn(this.wnd,o))?a.clientWidth-a.scrollWidth:0)-a.scrollLeft+e.xDocOffset)*i,h=(-a.scrollTop+e.yDocOffset)*i,c=[];for(let R of t){let v=R.decoration.style,C=(y=v.layout)!=null?y:"boxes",z=(f=v.width)!=null?f:"wrap",k=this.scaledExpand(v),T=R.range.getBoundingClientRect(),O=C==="bounds"?[k?{left:T.left-k,top:T.top-k,right:T.right+k,bottom:T.bottom+k,width:T.width+k*2,height:T.height+k*2}:T]:ee(R.range,!1,!1,k);for(let x of O){let P;switch(z){case"viewport":{let A=Math.floor(e.inlineStart(x)/e.viewportInlineSize)*e.viewportInlineSize;P=e.toRect(A,e.blockStart(x),e.viewportInlineSize,e.blockSize(x));break}case"page":{let A=Math.floor(e.inlineStart(x)/e.pageInlineSize)*e.pageInlineSize;P=e.toRect(A,e.blockStart(x),e.pageInlineSize,e.blockSize(x));break}case"bounds":{P=e.toRect(e.inlineStart(T),e.blockStart(x),e.inlineSize(T),e.blockSize(x));break}default:P=e.toRect(e.inlineStart(x),e.blockStart(x),e.inlineSize(x),e.blockSize(x))}c.push(P)}}let d=this.closeInterlines(e,c).map(R=>{let v=(R.left+e.xDocOffset)*i,C=(R.top+e.yDocOffset)*i,z=(R.right+e.xDocOffset)*i,k=(R.bottom+e.yDocOffset)*i;return`M${v} ${C} H${z} V${k} H${v} Z`}).join(" "),u="http://www.w3.org/2000/svg";if(!this.maskSvg){this.requireShadowHost(),this.maskSvg=this.wnd.document.createElementNS(u,"svg"),this.maskSvg.style.cssText=`position:absolute;top:0;left:0;width:${r}px;height:${s}px;pointer-events:none;z-index:${to-1}`,this.maskSvg.dataset.readium="true";let R=this.wnd.document.createElementNS(u,"defs"),v=this.wnd.document.createElementNS(u,"mask"),C=`${this.id}-mask-holes`;v.setAttribute("id",C),v.setAttribute("maskUnits","userSpaceOnUse");let z=this.wnd.document.createElementNS(u,"rect");z.setAttribute("fill","white");let k=this.wnd.document.createElementNS(u,"path");k.setAttribute("fill","black"),v.append(z,k),R.appendChild(v),this.maskSvg.appendChild(R);let T=this.wnd.document.createElementNS(u,"rect");T.setAttribute("id",`${this.id}-mask-rect`),T.setAttribute("mask",`url(#${C})`),T.style.pointerEvents="none",this.maskSvg.appendChild(T),this.shadowRoot.appendChild(this.maskSvg)}this.maskSvg.style.display="",this.maskSvg.style.left=`${l}px`,this.maskSvg.style.top=`${h}px`,this.maskSvg.style.width=`${r}px`,this.maskSvg.style.height=`${s}px`,this.maskSvg.setAttribute("viewBox",`${l} ${h} ${r} ${s}`);let m=this.maskSvg.querySelector("mask");m==null||m.setAttribute("x",String(l)),m==null||m.setAttribute("y",String(h)),m==null||m.setAttribute("width",String(r)),m==null||m.setAttribute("height",String(s));let g=this.maskSvg.querySelector("mask > rect");g==null||g.setAttribute("x",String(l)),g==null||g.setAttribute("y",String(h)),g==null||g.setAttribute("width",String(r)),g==null||g.setAttribute("height",String(s));let b=this.maskSvg.querySelector("mask > path");b&&b.setAttribute("d",d);let S=this.maskSvg.querySelector(":scope > rect");if(S){let R=t[0].decoration.style.tint,v=R?void 0:this.opaqueBackgroundColor(),C=(w=R!=null?R:v)!=null?w:Nn(L.Mask),z=v?"0.5":"1";S.setAttribute("x",String(l)),S.setAttribute("y",String(h)),S.setAttribute("width",String(r)),S.setAttribute("height",String(s)),S.setAttribute("fill",C),S.setAttribute("fill-opacity",z)}}closeInterlines(t,e){let i=e.map(s=>({i0:t.inlineStart(s),i1:t.inlineStart(s)+t.inlineSize(s),b0:t.blockStart(s),b1:t.blockStart(s)+t.blockSize(s)})).sort((s,a)=>s.b0-a.b0),o=i.map(s=>s.b1),r=i.map(s=>s.b0);return i.forEach((s,a)=>{let l=i.flatMap((d,u)=>d.b0>=s.b1&&d.i0<s.i1&&d.i1>s.i0&&d.b0-s.b1<Math.min(s.b1-s.b0,d.b1-d.b0)?[u]:[]);if(l.length===0)return;let h=i[l[0]],c=(s.b1+h.b0)/2;o[a]=c;for(let d of l)i[d].b0<h.b1&&(r[d]=Math.min(r[d],c))}),i.map((s,a)=>t.toRect(s.i0,r[a],s.i1-s.i0,o[a]-r[a]))}injectCustomStylesheet(t){let e=`${this.id}-custom-style`,i=this.wnd.document.getElementById(e);i||(i=this.wnd.document.createElement("style"),i.id=e,i.dataset.readium="true",this.wnd.document.head.appendChild(i)),i.innerHTML=t}clearContainer(){var t;if(this.experimentalHighlights){let e=this.wnd.CSS.highlights;for(let i of this._tintSubKeys.values())e.delete(i);this._tintSubKeys.clear(),this._subKeyCounter=0}(t=this.wnd.document.getElementById(`${this.id}-custom-style`))==null||t.remove(),this.container&&(this.container.remove(),this.container=void 0)}},ba=class Xe extends yt{constructor(){super(...arguments),this.observedResizeTargets=new Map,this.resizeFrame=0,this.lastGroupId=0,this.groups=new Map,this.handleResizer=this.handleResize.bind(this),this.scrollScheduled=!1,this.handleScroller=this.handleScroll.bind(this)}cleanup(){this.groups.forEach(t=>t.destroy()),this.groups.clear(),this.observedResizeTargets.clear()}updateHighlightStyles(){this.groups.forEach(t=>{t.requestLayout()})}handleResize(){this.wnd.clearTimeout(this.resizeFrame),this.resizeFrame=this.wnd.setTimeout(()=>{this.groups.forEach(t=>t.requestLayout())},50)}handleScroll(){this.scrollScheduled||(this.scrollScheduled=!0,this.wnd.requestAnimationFrame(()=>{this.scrollScheduled=!1,this.groups.forEach(t=>{t.hasOverlayItems&&t.repositionOverlays()})}))}mount(t,e){return this.wnd=t,e.register("decorate",Xe.moduleName,(i,o)=>{let r=i;(r.action==="add"||r.action==="update")&&r.decoration.locator&&(r.decoration.locator=G.deserialize(r.decoration.locator)),this.groups.has(r.group)||this.groups.set(r.group,new Un(t,e,`readium-decoration-${this.lastGroupId++}`,r.group));let s=this.groups.get(r.group);switch(r.action){case"add":s==null||s.add(r.decoration);break;case"remove":s==null||s.remove(r.decoration.id);break;case"clear":s==null||s.clear();break;case"update":s==null||s.update(r.decoration);break}o(!0)}),e.register("decoration_resize",Xe.moduleName,(i,o)=>{let r=i;r.action==="watch"?this.addDecorationResizeTarget(r.selector):this.removeDecorationResizeTarget(r.selector),o(!0)}),e.register("decoration_activatable",Xe.moduleName,(i,o)=>{let r=i,s=this.groups.get(r.group);s&&(s.activatable=r.activatable),o(!0)}),e.register("decoration_hoverable",Xe.moduleName,(i,o)=>{let r=i,s=this.groups.get(r.group);s&&(s.hoverable=r.hoverable),o(!0)}),this.resizeObserver=new ResizeObserver(()=>t.requestAnimationFrame(()=>this.handleResize())),this.resizeObserver.observe(t.document.documentElement),t.addEventListener("orientationchange",this.handleResizer),t.addEventListener("resize",this.handleResizer),t.addEventListener("scroll",this.handleScroller,{passive:!0,capture:!0}),this.styleObserver=new MutationObserver(i=>{i.some(o=>o.type==="attributes"&&o.attributeName==="style"&&o.oldValue!==o.target.getAttribute("style"))&&this.updateHighlightStyles()}),this.styleObserver.observe(t.document.documentElement,{attributes:!0,attributeFilter:["style"],attributeOldValue:!0}),e.log("Decorator Mounted"),!0}unmount(t,e){return t.removeEventListener("orientationchange",this.handleResizer),t.removeEventListener("resize",this.handleResizer),t.removeEventListener("scroll",this.handleScroller,{capture:!0}),e.unregisterAll(Xe.moduleName),this.resizeObserver.disconnect(),this.styleObserver.disconnect(),this.cleanup(),e.log("Decorator Unmounted"),!0}addDecorationResizeTarget(t){let e=this.observedResizeTargets.get(t);e&&this.resizeObserver.unobserve(e);let i=this.wnd.document.querySelector(t);i?(this.resizeObserver.observe(i),this.observedResizeTargets.set(t,i)):this.observedResizeTargets.delete(t)}removeDecorationResizeTarget(t){let e=this.observedResizeTargets.get(t);e&&(this.resizeObserver.unobserve(e),this.observedResizeTargets.delete(t))}};ba.moduleName="decorator";var In=ba;p();var va=class ve extends yt{wndOnErr(t){var e;(e=this.comms)==null||e.send("error",{message:t.message,filename:t.filename,lineno:t.lineno,colno:t.colno})}mount(t,e){return this.comms=e,t.addEventListener("error",this.wndOnErr,!1),e.register("get_properties",ve.moduleName,(i,o)=>{_i(t),o(!0)}),e.register("update_properties",ve.moduleName,(i,o)=>{io(t,i),o(!0)}),e.register("set_property",ve.moduleName,(i,o)=>{let r=i;Qt(t,r[0],r[1]),o(!0)}),e.register("remove_property",ve.moduleName,(i,o)=>{ye(t,i),o(!0)}),e.register("activate",ve.moduleName,(i,o)=>{o(!0)}),e.log("WebPubSetup Mounted"),!0}unmount(t,e){return e.unregisterAll(ve.moduleName),t.removeEventListener("error",this.wndOnErr),e.log("WebPubSetup Unmounted"),!0}};va.moduleName="webpub_setup";var wa=va;p();var Ra=class Hn extends yt{constructor(){super(...arguments),this.styleElement=null,this.beforePrintHandler=null,this.configApplied=!1}setupPrintProtection(t,e){if(!e.disable)return;let i=t.document.createElement("style");i.textContent=`
            @media print {
                body * {
                    display: none !important;
                }
                body::after {
                    content: "${e.watermark||"Printing has been disabled"}";
                    font-size: 200%;
                    display: block;
                    text-align: center;
                    margin-top: 50vh;
                    transform: translateY(-50%);
                }
            }
        `,t.document.head.appendChild(i),this.styleElement=i,this.beforePrintHandler=o=>(o.preventDefault(),!1),t.addEventListener("beforeprint",this.beforePrintHandler)}registerPrintHandlers(){var t;(t=this.comms)==null||t.register("print_protection",Hn.moduleName,e=>{var o;let i=e;return this.configApplied||(this.configApplied=!0,this.setupPrintProtection(this.wnd,i),(o=this.comms)==null||o.log("Print protection configuration applied")),!0})}mount(t,e){return this.wnd=t,this.comms=e,this.registerPrintHandlers(),!0}unmount(t,e){var i,o;return this.beforePrintHandler&&(t.removeEventListener("beforeprint",this.beforePrintHandler),this.beforePrintHandler=null),(i=this.styleElement)!=null&&i.parentNode&&(this.styleElement.parentNode.removeChild(this.styleElement),this.styleElement=null),(o=this.comms)==null||o.unregisterAll(Hn.moduleName),this.configApplied=!1,!0}};Ra.moduleName="print_protection";var Ca=Ra;p();var Ea="readium-cjk-vertical-snapper-style",xa=class mt extends q{constructor(){super(...arguments),this.patternAnalyzer=null,this.lastScrollTime=0,this.isScrollProtectionEnabled=!1,this.initialScrollHandled=!1,this.isScrolling=!1,this.lastScrollLeft=0,this.isResizing=!1,this.resizeDebounce=null,this.verticalLR=!1,this.handleScroll=t=>{if(this.comms.ready&&!this.isResizing){if(!this.initialScrollHandled){this.lastScrollLeft=Math.abs(this.doc().scrollLeft),this.initialScrollHandled=!0,this.reportProgress();return}this.isScrolling||(this.isScrolling=!0,this.wnd.requestAnimationFrame(()=>{var o;this.reportProgress();let e=Math.abs(this.doc().scrollLeft),i=e-this.lastScrollLeft;if(this.lastScrollLeft=e,this.isScrollProtectionEnabled&&Math.abs(i)>5){let r=Date.now(),s=r-(this.lastScrollTime||r);if(this.patternAnalyzer&&this.patternAnalyzer.analyze(i>0?"down":"up",Math.abs(i),s)){let a=t.target&&"tagName"in t.target?{tagName:t.target.tagName}:null;(o=this.comms)==null||o.send("content_protection",{type:"suspicious_scrolling",timestamp:Date.now(),scrollDelta:i,scrollDirection:i>0?"left":"right",targetElement:a})}this.lastScrollTime=r}this.comms.send("scroll",i),this.isScrolling=!1}))}}}doc(){return this.wnd.document.scrollingElement}scrollable(){return Math.max(0,this.doc().scrollWidth-this.wnd.innerWidth)}hasScrolledPast(t){let e=t.getBoundingClientRect(),i=this.wnd.innerWidth/2,o=this.wnd.innerWidth*q.CENTER_TOLERANCE;return this.verticalLR?e.right<=i+o:e.left>=i-o}inCenterBand(t){let e=t.getBoundingClientRect(),i=this.wnd.innerWidth/2,o=this.wnd.innerWidth*q.CENTER_TOLERANCE,r=i-o,s=i+o;return e.width===0?e.left<=s&&e.left>=r:Math.max(0,Math.min(e.right,s)-Math.max(e.left,r))/e.width>=q.CENTER_TOLERANCE}fragmentStart(t){return t.getBoundingClientRect().left+Math.abs(this.doc().scrollLeft)}currentScrollExtent(){return{pos:Math.abs(this.doc().scrollLeft),size:this.wnd.innerWidth}}rectStart(t){let e=Math.abs(this.doc().scrollLeft);return this.verticalLR?t.left+e:e+this.wnd.innerWidth-t.right}reportProgress(t){if(!this.comms.ready)return;let e=this.doc().scrollWidth,i=this.wnd.innerWidth,o=Math.max(1,e-i),r=Math.abs(this.doc().scrollLeft),s=Math.max(0,Math.min(1,r/o)),a=Math.max(0,Math.min(1,(r+i)/e));this.comms.send("progress",{start:s,end:a,fragmentId:t!==void 0?t:this.currentTimelineFragment(),visibleFragmentIds:this.sortedVisibleFragmentIds()}),this.sendTextLayout()}enableScrollProtection(){var t;this.patternAnalyzer||(this.patternAnalyzer=new Nt(Ve),this.isScrollProtectionEnabled=!0,(t=this.comms)==null||t.log("Scroll protection enabled"))}mount(t,e){this.wnd=t,this.comms=e,this.initialScrollHandled=!1,this.lastScrollLeft=0,this.isResizing=!1,this.verticalLR=kn(t),this.resizeDebounce&&(this.wnd.clearTimeout(this.resizeDebounce),this.resizeDebounce=null),t.navigator.epubReadingSystem&&(t.navigator.epubReadingSystem.layoutStyle="scrolling");let i=t.document.createElement("style");return i.dataset.readium="true",i.id=Ea,i.textContent=`
        * {
            scrollbar-width: none;
        }
        body::-webkit-scrollbar {
            display: none;
        }
        html {
            overflow-x: auto !important;
            overflow-y: hidden !important;
        }
        `,t.document.head.appendChild(i),this.resizeObserver=new ResizeObserver(()=>{this.resizeDebounce&&this.wnd.clearTimeout(this.resizeDebounce),this.isResizing=!0,this.resizeDebounce=this.wnd.setTimeout(()=>{this.isResizing=!1,this.resizeDebounce=null,this.refreshFragmentStarts(),this.reportProgress(),this.sendTextLayout(!0)},50)}),this.resizeObserver.observe(t.document.body),t.addEventListener("scroll",this.handleScroll,{passive:!0}),e.register("force_webkit_recalc",mt.moduleName,()=>{Ge(this.wnd);let o=this.doc().scrollLeft;this.verticalLR?this.doc().scrollLeft=o>1?o-1:o+1:this.doc().scrollLeft=o<-1?o+1:o-1,this.doc().scrollLeft=o}),this.registerTextLayout(t,e,mt.moduleName),this.registerNavigationLock(t,e,mt.moduleName),e.register("go_progression",mt.moduleName,(o,r)=>{let s=o;if(s<0||s>1){e.send("error",{message:"go_progression must be given a position from 0.0 to 1.0"}),r(!1);return}this.wnd.requestAnimationFrame(()=>{let a=this.scrollable()*s;this.doc().scrollLeft=this.verticalLR?a:-a,this.reportProgress(this.fragmentFromGeometry()),W(this.wnd),r(!0)})}),e.register("go_id",mt.moduleName,(o,r)=>{let s=t.document.getElementById(o);if(!s){r(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollLeft+=s.getBoundingClientRect().left-t.innerWidth/2;let a=o;this.reportProgress(this.timelineEntries.has(a)?a:this.nearestPrecedingTimelineEntry(s)),W(this.wnd),r(!0)})}),e.register("go_text",mt.moduleName,(o,r)=>{let s=q.rangeOf(t,o);if(!s){r(!1);return}this.wnd.requestAnimationFrame(()=>{this.doc().scrollLeft+=s.getBoundingClientRect().left-t.innerWidth/2,this.reportProgress(this.nearestPrecedingTimelineEntry(s.startContainer)),W(this.wnd),r(!0)})}),e.register("go_start",mt.moduleName,(o,r)=>{if(this.doc().scrollLeft===0)return r(!1);this.doc().scrollLeft=0,this.reportProgress(this.firstFragmentIfReached()),r(!0)}),e.register("go_end",mt.moduleName,(o,r)=>{if(Math.abs(this.doc().scrollLeft)===this.scrollable())return r(!1);this.doc().scrollLeft=this.verticalLR?this.scrollable():-this.scrollable(),this.reportProgress(this.sortedFragmentIds[this.sortedFragmentIds.length-1]),r(!0)}),e.register(["go_next","go_prev"],mt.moduleName,(o,r)=>r(!1)),e.register("unfocus",mt.moduleName,(o,r)=>{W(this.wnd),r(!0)}),e.register("scroll_protection",mt.moduleName,(o,r)=>{this.enableScrollProtection(),r(!0)}),e.register("focus",mt.moduleName,(o,r)=>{this.reportProgress(),r(!0)}),e.register("first_visible_locator",mt.moduleName,(o,r)=>{let s=te(t,!0);this.comms.send("first_visible_locator",s.serialize()),r(!0)}),e.register("timeline_entries",mt.moduleName,(o,r)=>{this.updateTimelineEntries(Array.isArray(o)?o:[],t),r(!0)}),e.log("CJKVerticalSnapper Mounted"),!0}unmount(t,e){var i;return e.unregisterAll(mt.moduleName),this.unwatchTextLayout(),this.unlockNavigation(t),this.resizeObserver.disconnect(),this.handleScroll&&t.removeEventListener("scroll",this.handleScroll),(i=t.document.getElementById(Ea))==null||i.remove(),this.patternAnalyzer&&(this.patternAnalyzer.clear(),this.patternAnalyzer=null,this.isScrollProtectionEnabled=!1),this.timelineEntries.clear(),this.cachedFragmentIds=[],this.sortedFragmentIds=[],this.cachedFragmentStarts.clear(),e.log("CJKVerticalSnapper Unmounted"),!0}};xa.moduleName="cjk_vertical_snapper";var Pa=xa;var Wn=["fixed_setup","decorator","peripherals","print_protection"],Bn=["reflowable_setup","decorator","peripherals","column_snapper","scroll_snapper","cjk_vertical_snapper","print_protection"];var Ke=new Map([ma,ca,wa,Qs,sa,In,Ks,Js,Pa,Ca].map(n=>[n.moduleName,n]));var Xt=class{constructor(t=window,e=[]){var o;this.loadedModules=[],this.wnd=t,(o=t._readium_cssSelectorGenerator)!=null||(t._readium_cssSelectorGenerator={getCssSelector:wn}),this.comms=new Si(t);let i=[...new Set(e)];if(i.length){if(typeof t>"u")throw Error("Loader is not in a web browser");t.parent!==t&&this.comms.log("Loader is probably in a frame"),this.loadedModules=i.map(r=>{let s=this.loadModule(r);if(s)return s.mount(this.wnd,this.comms),s}).filter(r=>r!==void 0)}}loadModule(t){let e=Ke.get(t);return e===void 0?(this.comms.log(`Module "${name}" does not exist in the library`),e):new e}addModule(t){let e=this.loadModule(t);return!e||!e.mount(this.wnd,this.comms)?!1:(this.loadedModules.push(e),!0)}removeModule(t){let e=Ke.get(t);if(e===void 0)return this.comms.log(`Module "${t}" does not exist in the library`),!1;let i=this.loadedModules.findIndex(o=>o instanceof e);return i<0?!1:(this.loadedModules[i].unmount(this.wnd,this.comms),this.loadedModules.splice(i,1),!0)}destroy(){this.comms.destroy(),this.loadedModules.forEach(t=>t.unmount(this.wnd,this.comms)),this.loadedModules=[]}};p();var jn={type:"developer_tools",keyCombos:[{keyCode:73,meta:!0,alt:!0},{keyCode:73,ctrl:!0,shift:!0},{keyCode:74,meta:!0,alt:!0},{keyCode:74,ctrl:!0,shift:!0},{keyCode:85,meta:!0,alt:!0},{keyCode:67,meta:!0,alt:!0},{keyCode:67,meta:!0,shift:!0},{keyCode:67,ctrl:!0,shift:!0},{keyCode:65,meta:!0,alt:!0},{keyCode:84,meta:!0,shift:!0,alt:!0},{keyCode:67,shift:!0,alt:!0},{keyCode:123},{keyCode:123,shift:!0},{keyCode:123,ctrl:!0,shift:!0},{keyCode:123,meta:!0,alt:!0}]},Gn={type:"select_all",keyCombos:[{keyCode:65,meta:!0},{keyCode:65,ctrl:!0}]},Vn={type:"print",keyCombos:[{keyCode:80,meta:!0},{keyCode:80,ctrl:!0},{keyCode:80,meta:!0,shift:!0},{keyCode:80,ctrl:!0,shift:!0},{keyCode:80,meta:!0,alt:!0},{keyCode:80,ctrl:!0,alt:!0}]},$n={type:"save",keyCombos:[{keyCode:83,meta:!0},{keyCode:83,ctrl:!0}]};var Xn=class{mergeKeyboardPeripherals(t,e=[]){var s;let i=[],o=e.filter(a=>!["developer_tools","select_all","print","save"].includes(a.type));t.disableSelectAll&&i.push(Gn),t.disableSave&&i.push($n),t.monitorDevTools&&i.push(jn),(s=t.protectPrinting)!=null&&s.disable&&i.push(Vn);let r=[...i];for(let a of o){let l=a.keyCombos.filter(h=>!i.some(c=>c.keyCombos.some(d=>h.keyCode===d.keyCode&&h.ctrl===d.ctrl&&h.shift===d.shift&&h.alt===d.alt&&h.meta===d.meta&&(r.includes(c)||h.condition===d.condition))));l.length>0&&i.push({...a,keyCombos:l})}return i}},lo=class n extends Xn{constructor(){super(...arguments),this.viewportWatchers=new Set}watchViewport(t){return this.viewportWatchers.add(t),()=>{this.viewportWatchers.delete(t)}}notifyViewportChange(t){let e=this.viewport,i={readingOrder:[...e.readingOrder],progressions:new Map([...e.progressions].map(([o,r])=>[o,{...r}])),positions:e.positions?[...e.positions]:null};this.notifiedViewport&&n.sameViewport(this.notifiedViewport,i)||(this.notifiedViewport=i,t(i),this.viewportWatchers.forEach(o=>o(i)))}static sameViewport(t,e){let i=(o,r)=>o===r||!!o&&!!r&&o.length===r.length&&o.every((s,a)=>s===r[a]);return i(t.readingOrder,e.readingOrder)&&i(t.positions,e.positions)&&t.readingOrder.every(o=>{var r,s,a,l;return((r=t.progressions.get(o))==null?void 0:r.start)===((s=e.progressions.get(o))==null?void 0:s.start)&&((a=t.progressions.get(o))==null?void 0:a.end)===((l=e.progressions.get(o))==null?void 0:l.end)})}goLeft(t=!1,e){this.readingProgression===D.ltr?this.goBackward(t,e):this.readingProgression===D.rtl&&this.goForward(t,e)}goRight(t=!1,e){this.readingProgression===D.ltr?this.goForward(t,e):this.readingProgression===D.rtl&&this.goBackward(t,e)}};p();p();var ka=new Set(Object.values(L));function Kn(n,t){return n===L.TextColor?typeof window<"u"&&"Highlight"in window:ka.has(n)?!0:!!(t!=null&&t[n])}function vi(n,t){let{style:e}=n;if(e.type===L.Template){let i=e;return{...n,style:{...i,element:Fa(i,n)}}}if(e.type&&(t!=null&&t[e.type])){let i=t[e.type];return{...n,style:{type:L.Template,layout:i.layout,width:i.width,stylesheet:i.stylesheet,element:Fa(i,n)}}}return n}function Fa(n,t){return typeof n.element=="function"?n.element(t):n.element}function Xc(n,t){var o,r,s,a;if(n.type!==t.type)return!1;if(n.type===L.Template){let l=n,h=t;return l.layout===h.layout&&l.width===h.width&&l.stylesheet===h.stylesheet}let e=n,i=t;return e.tint===i.tint&&e.layout===i.layout&&e.width===i.width&&((o=e.enforceContrast)!=null?o:!0)===((r=i.enforceContrast)!=null?r:!0)&&((s=e.expand)!=null?s:0)===((a=i.expand)!=null?a:0)&&e.thickness===i.thickness&&e.lineStyle===i.lineStyle}function Yn(n,t){var e,i,o,r,s,a,l,h,c,d;return n.locator.href===t.locator.href&&JSON.stringify((o=(i=(e=n.locator.locations)==null?void 0:e.serialize)==null?void 0:i.call(e))!=null?o:n.locator.locations)===JSON.stringify((a=(s=(r=t.locator.locations)==null?void 0:r.serialize)==null?void 0:s.call(r))!=null?a:t.locator.locations)&&JSON.stringify((l=n.locator.text)!=null?l:null)===JSON.stringify((h=t.locator.text)!=null?h:null)&&Xc(n.style,t.style)&&JSON.stringify((c=n.extras)!=null?c:null)===JSON.stringify((d=t.extras)!=null?d:null)}p();var Kc=1e4,Yc=5e3,we=class{constructor(t,e){this.registry=new Map,this._ready=!1,this.listenerBuffer=[],this.visibleTime=0,this.visibleSince=document.hidden?void 0:performance.now(),this.visibilityHandler=this.handleVisibility.bind(this),this.handler=this.handle.bind(this),this.wnd=t,this.origin=e;try{this.channelId=window.crypto.randomUUID()}catch{this.channelId=He()}this.startGc(),window.addEventListener("message",this.handler),this.send("_ping",void 0)}set listener(t){this.listenerBuffer.length>0&&this.listenerBuffer.forEach(e=>t(e[0],e[1])),this.listenerBuffer=[],this._listener=t}clearListener(){typeof this._listener=="function"&&(this._listener=void 0)}startGc(){this.gc===void 0&&(this.handleVisibility(),document.addEventListener("visibilitychange",this.visibilityHandler),this.gc=setInterval(()=>{let t=this.visibleNow();this.registry.forEach((e,i)=>{t-e.time>Kc&&(console.warn(i,"event for",e.key,"was never handled!"),this.registry.delete(i))})},Yc))}stopGc(){this.visibleTime=this.visibleNow(),this.visibleSince=void 0,document.removeEventListener("visibilitychange",this.visibilityHandler),clearInterval(this.gc),this.gc=void 0}visibleNow(){return this.visibleTime+(this.visibleSince===void 0?0:performance.now()-this.visibleSince)}handleVisibility(){document.hidden?(this.visibleTime=this.visibleNow(),this.visibleSince=void 0):this.visibleSince===void 0&&(this.visibleSince=performance.now())}halt(){this._ready=!1,window.removeEventListener("message",this.handler),this.stopGc(),this._listener=void 0,this.registry.clear()}resume(){window.addEventListener("message",this.handler),this.startGc(),this._ready=!0}handle(t){let e=t.data;if(!e._readium){console.warn("Ignoring",e);return}if(e._channel===this.channelId)switch(e.key){case"_ack":{if(!e.id)return;let i=this.registry.get(e.id);if(!i)return;this.registry.delete(e.id),i.cb(!!e.data);return}case"_pong":this._ready=!0;default:{if(!this.ready)return;typeof this._listener=="function"?this._listener(e.key,e.data):this.listenerBuffer.push([e.key,e.data])}}}get ready(){return this._ready}send(t,e,i,o=!1,r=[]){let s=He();return i&&this.registry.set(s,{cb:i,time:this.visibleNow(),key:t}),this.wnd.postMessage({_readium:Zt,_channel:this.channelId,id:s,data:e,key:t,strict:o},"/",r),s}};p();var oe=class{constructor(t,e){this.config=t,this.onUpdate=e,this.unsubs=[],this.conditionValues=new Map}setup(){let t=!0,e=new Map;this.config.forEach(i=>i.keyCombos.forEach(o=>{var r;if(o.condition){let s=(r=e.get(o.condition))!=null?r:[];s.push(o),e.set(o.condition,s)}})),e.forEach((i,o)=>{let r=o.subscribe(s=>{i.forEach(a=>this.conditionValues.set(a,s)),t||this.onUpdate(this.buildSerializable())});this.unsubs.push(r)}),t=!1,this.onUpdate(this.buildSerializable())}buildSerializable(){return this.config.map(t=>({...t,keyCombos:t.keyCombos.filter(e=>!e.condition||this.conditionValues.get(e)===!0).map(({condition:e,...i})=>i)})).filter(t=>t.keyCombos.length>0)}destroy(){this.unsubs.forEach(t=>t()),this.unsubs=[],this.conditionValues.clear()}};p();function ho(){let n=Promise.resolve();return t=>{let e=n.then(t);return n=e.catch(()=>{}),e}}p();p();var qn,Ta;function za(){if(Ta)return qn;Ta=1;function n(o){if(typeof o!="string")throw new TypeError("Path must be a string. Received "+JSON.stringify(o))}function t(o,r){for(var s="",a=0,l=-1,h=0,c,d=0;d<=o.length;++d){if(d<o.length)c=o.charCodeAt(d);else{if(c===47)break;c=47}if(c===47){if(!(l===d-1||h===1))if(l!==d-1&&h===2){if(s.length<2||a!==2||s.charCodeAt(s.length-1)!==46||s.charCodeAt(s.length-2)!==46){if(s.length>2){var u=s.lastIndexOf("/");if(u!==s.length-1){u===-1?(s="",a=0):(s=s.slice(0,u),a=s.length-1-s.lastIndexOf("/")),l=d,h=0;continue}}else if(s.length===2||s.length===1){s="",a=0,l=d,h=0;continue}}r&&(s.length>0?s+="/..":s="..",a=2)}else s.length>0?s+="/"+o.slice(l+1,d):s=o.slice(l+1,d),a=d-l-1;l=d,h=0}else c===46&&h!==-1?++h:h=-1}return s}function e(o,r){var s=r.dir||r.root,a=r.base||(r.name||"")+(r.ext||"");return s?s===r.root?s+a:s+o+a:a}var i={resolve:function(){for(var o="",r=!1,s,a=arguments.length-1;a>=-1&&!r;a--){var l;a>=0?l=arguments[a]:(s===void 0&&(s=process.cwd()),l=s),n(l),l.length!==0&&(o=l+"/"+o,r=l.charCodeAt(0)===47)}return o=t(o,!r),r?o.length>0?"/"+o:"/":o.length>0?o:"."},normalize:function(o){if(n(o),o.length===0)return".";var r=o.charCodeAt(0)===47,s=o.charCodeAt(o.length-1)===47;return o=t(o,!r),o.length===0&&!r&&(o="."),o.length>0&&s&&(o+="/"),r?"/"+o:o},isAbsolute:function(o){return n(o),o.length>0&&o.charCodeAt(0)===47},join:function(){if(arguments.length===0)return".";for(var o,r=0;r<arguments.length;++r){var s=arguments[r];n(s),s.length>0&&(o===void 0?o=s:o+="/"+s)}return o===void 0?".":i.normalize(o)},relative:function(o,r){if(n(o),n(r),o===r||(o=i.resolve(o),r=i.resolve(r),o===r))return"";for(var s=1;s<o.length&&o.charCodeAt(s)===47;++s);for(var a=o.length,l=a-s,h=1;h<r.length&&r.charCodeAt(h)===47;++h);for(var c=r.length,d=c-h,u=l<d?l:d,m=-1,g=0;g<=u;++g){if(g===u){if(d>u){if(r.charCodeAt(h+g)===47)return r.slice(h+g+1);if(g===0)return r.slice(h+g)}else l>u&&(o.charCodeAt(s+g)===47?m=g:g===0&&(m=0));break}var b=o.charCodeAt(s+g),S=r.charCodeAt(h+g);if(b!==S)break;b===47&&(m=g)}var y="";for(g=s+m+1;g<=a;++g)(g===a||o.charCodeAt(g)===47)&&(y.length===0?y+="..":y+="/..");return y.length>0?y+r.slice(h+m):(h+=m,r.charCodeAt(h)===47&&++h,r.slice(h))},_makeLong:function(o){return o},dirname:function(o){if(n(o),o.length===0)return".";for(var r=o.charCodeAt(0),s=r===47,a=-1,l=!0,h=o.length-1;h>=1;--h)if(r=o.charCodeAt(h),r===47){if(!l){a=h;break}}else l=!1;return a===-1?s?"/":".":s&&a===1?"//":o.slice(0,a)},basename:function(o,r){if(r!==void 0&&typeof r!="string")throw new TypeError('"ext" argument must be a string');n(o);var s=0,a=-1,l=!0,h;if(r!==void 0&&r.length>0&&r.length<=o.length){if(r.length===o.length&&r===o)return"";var c=r.length-1,d=-1;for(h=o.length-1;h>=0;--h){var u=o.charCodeAt(h);if(u===47){if(!l){s=h+1;break}}else d===-1&&(l=!1,d=h+1),c>=0&&(u===r.charCodeAt(c)?--c===-1&&(a=h):(c=-1,a=d))}return s===a?a=d:a===-1&&(a=o.length),o.slice(s,a)}else{for(h=o.length-1;h>=0;--h)if(o.charCodeAt(h)===47){if(!l){s=h+1;break}}else a===-1&&(l=!1,a=h+1);return a===-1?"":o.slice(s,a)}},extname:function(o){n(o);for(var r=-1,s=0,a=-1,l=!0,h=0,c=o.length-1;c>=0;--c){var d=o.charCodeAt(c);if(d===47){if(!l){s=c+1;break}continue}a===-1&&(l=!1,a=c+1),d===46?r===-1?r=c:h!==1&&(h=1):r!==-1&&(h=-1)}return r===-1||a===-1||h===0||h===1&&r===a-1&&r===s+1?"":o.slice(r,a)},format:function(o){if(o===null||typeof o!="object")throw new TypeError('The "pathObject" argument must be of type Object. Received type '+typeof o);return e("/",o)},parse:function(o){n(o);var r={root:"",dir:"",base:"",ext:"",name:""};if(o.length===0)return r;var s=o.charCodeAt(0),a=s===47,l;a?(r.root="/",l=1):l=0;for(var h=-1,c=0,d=-1,u=!0,m=o.length-1,g=0;m>=l;--m){if(s=o.charCodeAt(m),s===47){if(!u){c=m+1;break}continue}d===-1&&(u=!1,d=m+1),s===46?h===-1?h=m:g!==1&&(g=1):h!==-1&&(g=-1)}return h===-1||d===-1||g===0||g===1&&h===d-1&&h===c+1?d!==-1&&(c===0&&a?r.base=r.name=o.slice(1,d):r.base=r.name=o.slice(c,d)):(c===0&&a?(r.name=o.slice(1,h),r.base=o.slice(1,d)):(r.name=o.slice(c,h),r.base=o.slice(c,d)),r.ext=o.slice(h,d)),c>0?r.dir=o.slice(0,c-1):a&&(r.dir="/"),r},sep:"/",delimiter:":",win32:null,posix:null};return i.posix=i,qn=i,qn}var Jn=za();p();function ne(n){var i,o;let t=(o=(i=n.languages)==null?void 0:i[0])==null?void 0:o.toLowerCase(),e=n.readingProgression;if(t){if(t.startsWith("zh")||t.startsWith("ja")||t.startsWith("ko"))return e===D.rtl?"cjk-vertical":"cjk-horizontal";if(t.startsWith("mn-mong"))return"mongolian-vertical";if(t.startsWith("ar")||t.startsWith("fa")||t.startsWith("he"))return"rtl"}return"ltr"}p();p();var qc={description:"Attempts to filter out paragraphs that are implicitly headings or part of headers",scope:"RS",value:"readium-experimentalHeaderFiltering-on"},Jc={description:"Attempts to filter out elements that are sized using viewport units and should not be scaled directly e.g. tables, images, iframes, etc.",scope:"RS",value:"readium-experimentalZoom-on"},Oa={experimentalHeaderFiltering:qc,experimentalZoom:Jc};var co=Oa;var re=(n=>(n.start="start",n.left="left",n.right="right",n.justify="justify",n))(re||{}),Re={range:[0,100],step:1},Ce={range:[.7,4],step:.05},Ee={range:[100,1e3],step:100},xe={range:[50,250],step:10},Zn={range:[0,1],step:.125},Qn={range:[1,2.5],step:.1},Pe={range:[20,100],step:1},tr={range:[0,3],step:.25},er={range:[0,3],step:.25},ir={range:[0,2],step:.125};p();var wi=class{constructor(){}toFlag(t){return`readium-${t}-on`}toUnitless(t){return t.toString()}toPercentage(t,e=!1){return e||t>0&&t<=1?`${Math.round(t*100)}%`:`${t}%`}toVw(t){let e=Math.round(t*100);return`${Math.min(e,100)}vw`}toVh(t){let e=Math.round(t*100);return`${Math.min(e,100)}vh`}toPx(t){return`${t}px`}toRem(t){return`${t}rem`}};p();function La(n,t){return n==null||t==null||n<=t?n:void 0}function Aa(n,t){return n==null||t==null||n>=t?n:void 0}function pt(n){return typeof n=="string"?n:n===null?null:void 0}function K(n){return typeof n=="boolean"||n==null?n:void 0}function uo(n,t){if(n!==void 0)return n===null?null:t[n]!==void 0?n:void 0}function se(n){return typeof n=="boolean"||typeof n=="number"&&n>=0?n:n===null?null:void 0}function H(n){if(n!==void 0)return n===null?null:n<0?void 0:n}function ae(n,t){if(n===void 0)return;if(n===null)return null;let e=Math.min(...t),i=Math.max(...t);return n>=e&&n<=i?n:void 0}function mo(n,t){return n===void 0?t:n}function Ma(n){if(n!==void 0)return n===null?null:n.filter(t=>t in co)}p();var Z=class{constructor({initialValue:t=null,effectiveValue:e,isEffective:i,onChange:o}){this._value=t,this._effectiveValue=e,this._isEffective=i,this._onChange=o}set value(t){this._value=t,this._onChange(this._value)}get value(){return this._value}get effectiveValue(){return this._effectiveValue}get isEffective(){return this._isEffective}clear(){this._value=null}},_t=class extends Z{set value(t){this._value=t,this._onChange(this._value)}get value(){return this._value}get effectiveValue(){return this._effectiveValue}get isEffective(){return this._isEffective}clear(){this._value=null}toggle(){this._value=!this._value,this._onChange(this._value)}},po=class extends Z{constructor({initialValue:t=null,effectiveValue:e,isEffective:i,onChange:o,supportedValues:r}){super({initialValue:t,effectiveValue:e,isEffective:i,onChange:o}),this._supportedValues=r}set value(t){if(t&&!this._supportedValues.includes(t))throw new Error(`Value '${String(t)}' is not in the supported values for this preference.`);this._value=t,this._onChange(this._value)}get value(){return this._value}get effectiveValue(){return this._effectiveValue}get isEffective(){return this._isEffective}get supportedValues(){return this._supportedValues}clear(){this._value=null}},ht=class extends Z{constructor({initialValue:t=null,effectiveValue:e,isEffective:i,onChange:o,supportedRange:r,step:s}){super({initialValue:t,effectiveValue:e,isEffective:i,onChange:o}),this._supportedRange=r,this._step=s,this._decimals=this._step.toString().includes(".")?this._step.toString().split(".")[1].length:0}set value(t){if(t&&(t<this._supportedRange[0]||t>this._supportedRange[1]))throw new Error(`Value '${String(t)}' is out of the supported range for this preference.`);this._value=t,this._onChange(this._value)}get value(){return this._value}get effectiveValue(){return this._effectiveValue}get isEffective(){return this._isEffective}get supportedRange(){return this._supportedRange}get step(){return this._step}increment(){this._value&&this._value<this._supportedRange[1]&&(this._value=Math.min(Math.round((this._value+this._step)*10**this._decimals)/10**this._decimals,this._supportedRange[1]),this._onChange(this._value))}decrement(){this._value&&this._value>this._supportedRange[0]&&(this._value=Math.max(Math.round((this._value-this._step)*10**this._decimals)/10**this._decimals,this._supportedRange[0]),this._onChange(this._value))}format(t){return t.toString()}clear(){this._value=null}};p();var Da=n=>{if("blob"in n&&n.blob.type)return n.blob.type;if(n.as==="script")return"text/javascript";if(n.as==="link"&&"url"in n){let t=n.url.toLowerCase();if(t.endsWith(".css"))return"text/css";if([".js",".mjs",".cjs"].some(e=>t.endsWith(e)))return"text/javascript"}},Ua=(n,t)=>{t.attributes&&Object.entries(t.attributes).forEach(([e,i])=>{e==="type"||e==="rel"||e==="href"||e==="src"||i!=null&&(typeof i=="boolean"?i&&n.setAttribute(e,""):n.setAttribute(e,i))})},Zc=(n,t,e)=>{let i=n.createElement("script");i.dataset.readium="true",t.id&&(i.id=t.id);let o=t.type||Da(t);return o&&(i.type=o),Ua(i,t),i.src=e,i},Na=(n,t,e)=>{let i=n.createElement("link");i.dataset.readium="true",t.id&&(i.id=t.id),t.rel&&(i.rel=t.rel);let o=t.type||Da(t);return o&&(i.type=o),Ua(i,t),i.href=e,i},go=class{constructor(t){this.blobStore=new Map,this.createdBlobUrls=new Set,this.allowedDomains=[],this.injectableIdCounter=0,this.allowedDomains=(t.allowedDomains||[]).map(e=>{try{return new URL(e),e}catch{throw new Error(`Invalid allowed domain: "${e}". Must be a valid URL (e.g., "https://fonts.googleapis.com").`)}}),this.rules=t.rules.map(e=>{let i={...e};return e.prepend&&(i.prepend=e.prepend.map(o=>({...o,id:o.id||`injectable-${this.injectableIdCounter++}`})).reverse()),e.append&&(i.append=e.append.map(o=>({...o,id:o.id||`injectable-${this.injectableIdCounter++}`}))),i})}dispose(){for(let t of this.createdBlobUrls)try{URL.revokeObjectURL(t)}catch(e){console.warn("Failed to revoke blob URL:",t,e)}this.createdBlobUrls.clear()}getAllowedDomains(){return[...this.allowedDomains]}async injectForDocument(t,e){for(let i of this.rules)this.matchesRule(i,e)&&await this.applyRule(t,i)}matchesRule(t,e){let i=e.href;return t.resources.some(o=>o instanceof RegExp?o.test(i):i===o)}async getOrCreateBlobUrl(t){let e=t.id;if(this.blobStore.has(e)){let i=this.blobStore.get(e);return i.refCount++,i.url}if("blob"in t){let i=URL.createObjectURL(t.blob);return this.blobStore.set(e,{url:i,refCount:1}),this.createdBlobUrls.add(i),i}throw new Error("Resource must have a blob property")}async releaseBlobUrl(t){if(!this.createdBlobUrls.has(t))return;let e=Array.from(this.blobStore.values()).find(i=>i.url===t);if(e&&(e.refCount--,e.refCount<=0)){URL.revokeObjectURL(t),this.createdBlobUrls.delete(t);for(let[i,o]of this.blobStore.entries())if(o.url===t){this.blobStore.delete(i);break}}}async getResourceUrl(t,e){if("url"in t){let i=new URL(t.url,e.baseURI).toString();if(!this.isValidUrl(i,e))throw new Error(`Invalid URL: Only HTTPS, data:, blob:, or localhost HTTP URLs are allowed. Got: ${t.url}`);return i}else return this.getOrCreateBlobUrl(t)}createPreloadLink(t,e,i){if(e.as!=="link"||e.rel!=="preload")return;let o={...e,rel:"preload",attributes:{...e.attributes,as:e.as}},r=Na(t,o,i);t.head.appendChild(r)}createElement(t,e,i){if(e.as==="script")return Zc(t,e,i);if(e.as==="link")return Na(t,e,i);throw new Error(`Unsupported element type: ${e.as}`)}async applyRule(t,e){let i=[],o=e.prepend?e.prepend.filter(s=>!s.condition||s.condition(t)):[],r=e.append?e.append.filter(s=>!s.condition||s.condition(t)):[];try{for(let s of o)await this.processInjectable(s,t,i,"prepend");for(let s of r)await this.processInjectable(s,t,i,"append")}catch(s){for(let{element:a,url:l}of i)try{a.remove(),await this.releaseBlobUrl(l)}catch(h){console.error("Error during cleanup:",h)}throw s}}async processInjectable(t,e,i,o){let r=t.target==="body"?e.body:e.head;if(!r)return;let s=null;try{if(s=await this.getResourceUrl(t,e),t.rel==="preload"&&"url"in t)this.createPreloadLink(e,t,s);else{let a=this.createElement(e,t,s);i.push({element:a,url:s}),o==="prepend"?r.prepend(a):r.append(a)}}catch(a){throw console.error("Failed to process resource:",a),s&&"blob"in t&&await this.releaseBlobUrl(s),a}}isValidUrl(t,e){try{let i=new URL(t,e.baseURI);if(i.protocol==="data:"||i.protocol==="blob:"&&this.createdBlobUrls.has(t))return!0;if(this.allowedDomains.length>0){let o=i.origin;return this.allowedDomains.some(r=>{let s=new URL(r).origin;return o===s})}return!1}catch{return!1}}};p();var fo=n=>n.replace(/\/\/.*/g,"").replace(/\/\*[\s\S]*?\*\//g,"").replace(/\n/g,"").replace(/\s+/g," "),Ri=n=>n.replace(/\/\*(?:(?!\*\/)[\s\S])*\*\/|[\r\n\t]+/g,"").replace(/ {2,}/g," ");p();var Ia='!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports._readium_cssSelectorGenerator=t():e._readium_cssSelectorGenerator=t()}(self,()=>(()=>{"use strict";const e={d:(t,n)=>{if(Array.isArray(n))for(var o=0;o<n.length;){var r=n[o++],i=n[o++];e.o(t,r)?0===i&&o++:0===i?Object.defineProperty(t,r,{enumerable:!0,value:n[o++]}):Object.defineProperty(t,r,{enumerable:!0,get:i})}else for(var r in n)e.o(n,r)&&!e.o(t,r)&&Object.defineProperty(t,r,{enumerable:!0,get:n[r]})},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r:e=>{Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}};let t={};function n(e){return"object"==typeof e&&null!==e&&e.nodeType===Node.ELEMENT_NODE}e.r(t),e.d(t,{_readium_cssSelectorGenerator:()=>re,default:()=>ie,getCssSelector:()=>oe});const o={NONE:"",DESCENDANT:" ",CHILD:" > "},r={id:"id",class:"class",tag:"tag",attribute:"attribute",nthchild:"nthchild",nthoftype:"nthoftype"},i="_readium_cssSelectorGenerator";function s(e="unknown problem",...t){console.warn(`${i}: ${e}`,...t)}const c={selectors:[r.id,r.class,r.tag,r.attribute],includeTag:!1,whitelist:[],blacklist:[],combineWithinSelector:!0,combineBetweenSelectors:!0,root:null,maxCombinations:Number.POSITIVE_INFINITY,maxCandidates:Number.POSITIVE_INFINITY,useScope:!1,ignoreGeneratedClassNames:!1};function l(e){return!!e}function u(e){return e instanceof RegExp}function a(e){return["string","function"].includes(typeof e)||u(e)}function f(e){return Array.isArray(e)?e.filter(a):[]}function d(e){const t=[Node.DOCUMENT_NODE,Node.DOCUMENT_FRAGMENT_NODE,Node.ELEMENT_NODE];return function(e){return null!=e&&"object"==typeof e&&"nodeType"in e&&"number"==typeof e.nodeType}(e)&&t.includes(e.nodeType)}function p(e,t){if(d(e))return e.contains(t)||s("element root mismatch","Provided root does not contain the element. This will most likely result in producing a fallback selector using element\'s real root node. If you plan to use the selector using provided root (e.g. `root.querySelector`), it will not work as intended."),e;const n=t.getRootNode({composed:!1});return d(n)?(n.nodeType!==Node.DOCUMENT_NODE&&s("shadow root inferred","You did not provide a root and the element is a child of Shadow DOM. This will produce a selector using ShadowRoot as a root. If you plan to use the selector using document as a root (e.g. `document.querySelector`), it will not work as intended."),n):S(t)}function m(e){return"number"==typeof e?e:Number.POSITIVE_INFINITY}function g(e=[]){const[t=[],...n]=e;return 0===n.length?t:n.reduce((e,t)=>{const n=new Set(t);return e.filter(e=>n.has(e))},t)}function h(e){const t=e.map(e=>{if(u(e))return t=>e.test(t);if("function"==typeof e)return t=>{const n=e(t);return"boolean"!=typeof n?(s("pattern matcher function invalid","Provided pattern matching function does not return boolean. It\'s result will be ignored.",e),!1):n};if("string"==typeof e){const t=new RegExp("^"+e.replace(/[|\\\\{}()[\\]^$+?.]/g,"\\\\$&").replace(/\\*/g,".+")+"$");return e=>t.test(e)}return s("pattern matcher invalid","Pattern matching only accepts strings, regular expressions and/or functions. This item is invalid and will be ignored.",e),()=>!1});return e=>t.some(t=>t(e))}function y(e,t,n){const o=p(n,e[0]).querySelectorAll(t);if(o.length!==e.length)return!1;const r=new Set(o);return e.every(e=>r.has(e))}function b(e,t){t=null!=t?t:S(e);const o=[];let r=e;for(;r&&r!==t;)n(r)&&o.push(r),r=r.parentNode;return o}function N(e,t){return g(e.map(e=>b(e,t)))}function S(e){return e.ownerDocument.querySelector(":root")}const v=new RegExp(["^$","\\\\s"].join("|")),O=new RegExp(["^$"].join("|")),w=[r.nthoftype,r.tag,r.id,r.class,r.attribute,r.nthchild],E=h(["class","id","ng-*"]);function x({name:e}){return`[${e}]`}function T({name:e,value:t}){return`[${e}=\'${t}\']`}function j({nodeName:e,nodeValue:t}){return{name:B(e),value:B(null!=t?t:void 0)}}function C(e,t){const n=Array.from(e.attributes).filter(t=>function({nodeName:e,nodeValue:t},n){const o=n.tagName.toLowerCase();return!(["input","option"].includes(o)&&"value"===e||"src"===e&&(null==t?void 0:t.startsWith("data:"))||E(e))}(t,e)).map(j);return[...n.map(x),...n.map(T)]}const I=/^[a-z_-]{3,}$/i,A=/[bcdfghjklmnpqrstvwxyz]{4,}/i;function R(e,t){var n;const o=(null!==(n=e.getAttribute("class"))&&void 0!==n?n:"").trim().split(/\\s+/).filter(e=>!O.test(e));let r=o;if(null==t?void 0:t.ignoreGeneratedClassNames){const e=h(t.whitelist);r=o.filter(t=>{const n=`.${B(t)}`;return!!e(n)||function(e){if(!I.test(e))return!1;if(e.includes("_")&&!e.includes("__"))return!1;if(/^(css|sc|jsx|emotion|makeStyles|MuiButton|MuiBox)-/i.test(e))return!1;const t=e.split(/--|__|[-]|(?<=[a-z])(?=[A-Z])/).filter(e=>e.length>0);if(0===t.length)return!1;if(1===t.length&&t[0].length<4)return!1;for(const e of t){if(e.length<=2)return!1;if(A.test(e))return!1}return!0}(t)})}return r.map(e=>`.${B(e)}`)}function _(e,t){var n;const o=null!==(n=e.getAttribute("id"))&&void 0!==n?n:"",r=`#${B(o)}`,i=e.getRootNode({composed:!1});return!v.test(o)&&y([e],r,i)?[r]:[]}function $(e,t){const n=e.parentNode,o=n&&"children"in n?n.children:null;if(o)for(let t=0;t<o.length;t++)if(o[t]===e)return[`:nth-child(${String(t+1)})`];return[]}function D(e,t){return[B(e.tagName.toLowerCase())]}function P(e,t){const n=[...new Set((o=e.map(e=>D(e)),[].concat(...o)))];var o;return 0===n.length||n.length>1?[]:[n[0]]}function M(e,t){const n=P([e])[0],o=e.parentNode,r=o&&"children"in o?o:null;if(r){const t=Array.from(r.children).filter(e=>e.tagName.toLowerCase()===n),o=t.indexOf(e);if(o>-1)return[`${n}:nth-of-type(${String(o+1)})`]}return[]}function*k(e=[],{maxResults:t=Number.POSITIVE_INFINITY}={}){let n=0,o=L(1);for(;o.length<=e.length&&n<t;){n+=1;const t=new Array(o.length);for(let n=0;n<o.length;n++)t[n]=e[o[n]];yield t,o=G(o,e.length-1)}}function G(e=[],t=0){const n=e.length;if(0===n)return e;let o=n-1;for(;o>=0&&e[o]===t-(n-1-o);)o-=1;if(o<0)return L(n+1);e[o]+=1;for(let t=o+1;t<n;t++)e[t]=e[t-1]+1;return e}function L(e=1){const t=new Array(e);for(let n=0;n<e;n++)t[n]=n;return t}const F=":".charCodeAt(0).toString(16).toUpperCase(),V=/[ !"#$%&\'()[\\]{|}<>*+,./;=?@^`~\\\\]/;function B(e=""){return CSS?CSS.escape(e):function(e=""){return e.split("").map(e=>":"===e?`\\\\${F} `:V.test(e)?`\\\\${e}`:escape(e).replace(/%/g,"\\\\")).join("")}(e)}const Y={tag:P,id:function(e,t){return 0===e.length||e.length>1?[]:_(e[0])},class:function(e,t){return g(e.map(e=>R(e,t)))},attribute:function(e,t){return g(e.map(e=>C(e)))},nthchild:function(e,t){return g(e.map(e=>$(e)))},nthoftype:function(e,t){return g(e.map(e=>M(e)))}},q={tag:D,id:_,class:R,attribute:C,nthchild:$,nthoftype:M};function U(){const e=new Map;let t;return(n,o)=>{if(1!==n.length)return null!=t?t:t=W(n,o);const[r]=n;let i=e.get(r);return i||(i=W(n,o),e.set(r,i)),i}}function W(e,t){const{blacklist:n,whitelist:o,combineWithinSelector:r,maxCombinations:i}=t,s=h(n),c=h(o);return function(e){const{selectors:t,includeTag:n}=e,o=[...t];return n&&!o.includes("tag")&&o.push("tag"),o}(t).reduce((n,o)=>{const l=function(e,t,n){return(0,Y[t])(e,n)}(e,o,t),u=function(e=[],t,n){return e.filter(e=>n(e)||!t(e))}(l,s,c),a=function(e=[],t){return e.sort((e,n)=>{const o=t(e),r=t(n);return o&&!r?-1:!o&&r?1:0})}(u,c);return n[o]=r?Array.from(k(a,{maxResults:i})):a.map(e=>[e]),n},{})}function H(e){return e.includes(r.tag)||e.includes(r.nthoftype)?[...e]:[...e,r.tag]}function*z(e,t){const n={};for(const o of e){const e=t[o];e&&e.length>0&&(n[o]=e)}for(const e of function*(e={}){const t=Object.entries(e);if(0===t.length)return;const n=[{index:t.length-1,partial:{}}];for(;n.length>0;){const e=n.pop();if(!e)break;const{index:o,partial:r}=e;if(o<0){yield r;continue}const[i,s]=t[o];for(let e=s.length-1;e>=0;e--)n.push({index:o-1,partial:Object.assign(Object.assign({},r),{[i]:s[e]})})}}(n))yield Z(e)}function Z(e={}){const t=[...w];return e[r.tag]&&e[r.nthoftype]&&t.splice(t.indexOf(r.tag),1),t.map(t=>{return(o=e)[n=t]?o[n].join(""):"";var n,o}).join("")}function J(e,t){return[...e.map(e=>t+o.DESCENDANT+e),...e.map(e=>t+o.CHILD+e)]}function*K(e,t,n="",o,r=U()){const i=function*(e,t,n=U()){const o=new Set,r=n(e,t);for(const e of function*(e,t){for(const n of function(e){const{selectors:t,combineBetweenSelectors:n,includeTag:o,maxCandidates:r}=e,i=n?function(e=[],{maxResults:t=Number.POSITIVE_INFINITY}={}){return Array.from(k(e,{maxResults:t}))}(t,{maxResults:r}):t.map(e=>[e]);return o?i.map(H):i}(t))yield*z(n,e)}(r,t))o.has(e)||(o.add(e),yield e)}(e,o,r);for(const o of function*(e,t){if(""===t)yield*e;else for(const n of e)yield*J([n],t)}(i,n))y(e,o,t)&&(yield o)}function*Q(e,t,n="",o,r=U()){if(0===e.length)return null;const i=[e.length>1?e:[],...N(e,t).map(e=>[e])];for(const e of i)for(const i of K(e,t,n,o,r))yield{foundElements:e,selector:i}}function X(e){return{value:e,include:!1}}function ee({selectors:e,operator:t}){let n=[...w];e[r.tag]&&e[r.nthoftype]&&(n=n.filter(e=>e!==r.tag));let o="";return n.forEach(t=>{var n;(null!==(n=e[t])&&void 0!==n?n:[]).forEach(({value:e,include:t})=>{t&&(o+=e)})}),t+o}function te(e,t){const n=b(e,t).reverse(),i="object"==typeof(s=t)&&null!==s&&"nodeType"in s&&s.nodeType===Node.DOCUMENT_FRAGMENT_NODE&&"host"in s;var s;const c=n.map((e,t)=>{var n;const s=function(e,t,n=o.NONE){const r={};return t.forEach(t=>{Reflect.set(r,t,function(e,t){return q[t](e,void 0)}(e,t).map(X))}),{element:e,operator:n,selectors:r}}(e,[r.nthchild],i&&0===t?o.NONE:o.CHILD);return(null!==(n=s.selectors.nthchild)&&void 0!==n?n:[]).forEach(e=>{e.include=!0}),s});return[i?"":t?":scope":":root",...c.map(ee)].join("")}var ne=function(e,t){var n={};for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&t.indexOf(o)<0&&(n[o]=e[o]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var r=0;for(o=Object.getOwnPropertySymbols(e);r<o.length;r++)t.indexOf(o[r])<0&&Object.prototype.propertyIsEnumerable.call(e,o[r])&&(n[o[r]]=e[o[r]])}return n};function oe(e,t={}){return re(e,Object.assign(Object.assign({},t),{maxResults:1})).next().value}function*re(e,t={}){var o;const i=function(e){(e instanceof NodeList||e instanceof HTMLCollection)&&(e=Array.from(e));const t=(Array.isArray(e)?e:[e]).filter(n);return[...new Set(t)]}(e),s=function(e,t={}){const n=Object.assign(Object.assign({},c),t);return{selectors:(o=n.selectors,Array.isArray(o)?o.filter(e=>{return t=r,n=e,Object.values(t).includes(n);var t,n}):[]),whitelist:f(n.whitelist),blacklist:f(n.blacklist),root:p(n.root,e),combineWithinSelector:l(n.combineWithinSelector),combineBetweenSelectors:l(n.combineBetweenSelectors),includeTag:l(n.includeTag),maxCombinations:m(n.maxCombinations),maxCandidates:m(n.maxCandidates),useScope:l(n.useScope),maxResults:m(n.maxResults),ignoreGeneratedClassNames:l(n.ignoreGeneratedClassNames)};var o}(i[0],t),u=null!==(o=s.root)&&void 0!==o?o:S(i[0]);let a=0;for(const e of function*({elements:e,root:t,rootSelector:n="",options:o}){let r=t,i=n,s=!0;const c=U();for(;s;){let n=!1;for(const s of Q(e,r,i,o,c)){const{foundElements:o,selector:c}=s;if(n=!0,!y(e,c,t)){r=o[0],i=c;break}yield c}n||(s=!1)}}({elements:i,options:s,root:u,rootSelector:""}))if(yield e,a++,a>=s.maxResults)return;if(i.length>1){const{maxResults:e}=t,n=ne(t,["maxResults"]);if(yield i.map(e=>oe(e,n)).join(", "),a++,a>=s.maxResults)return}const d=void 0!==t.root;yield function(e,t){return e.map(e=>te(e,t)).join(", ")}(i,s.useScope||d?u:void 0)}const ie=oe;return t})());';p();var Ha=`(function() {
    if(window.onload) window.onload = new Proxy(window.onload, {
        apply: function(target, receiver, args) {
            if(!window._readium_blockEvents) {
                Reflect.apply(target, receiver, args);
                return;
            }
            _readium_blockedEvents.push([
                0, target, receiver, args
            ]);
        }
    });
})();
`;p();p();var So=class{constructor(t){if(this.detectedTools=new Set,!t.onDetected)throw new Error("onDetected callback is required");this.options=t,this.setupDetection()}isAutomationToolPresent(){let t=window;return t.domAutomation||t.domAutomationController?"Selenium":navigator.webdriver===!0?"Puppeteer/Playwright":t.__webdriver_evaluate||t.__selenium_evaluate?"Chrome Automation":t.callPhantom||t._phantom?"PhantomJS":t.__nightmare?"Nightmare":t.$testCafe?"TestCafe":null}setupDetection(){let t=this.isAutomationToolPresent();if(t){this.handleDetected(t);return}this.observer=new MutationObserver(()=>{let e=this.isAutomationToolPresent();e&&!this.detectedTools.has(e)&&this.handleDetected(e)}),this.observer.observe(document.documentElement,{childList:!0,subtree:!0,attributes:!0}),window.addEventListener("unload",()=>this.destroy())}handleDetected(t){var e,i;this.detectedTools.add(t),(i=(e=this.options).onDetected)==null||i.call(e,t)}destroy(){var t;(t=this.observer)==null||t.disconnect(),this.observer=void 0,this.detectedTools.clear()}};p();p();var Qc=0;function td(){return++Qc}var ed=`
onmessage = function(event) {
  var action = event.data;
  var startTime = performance.now()

  console[action.type](...action.payload);
  postMessage({
    id: action.id,
    time: performance.now() - startTime
  })
}
`,Wa=class{constructor(t,e){this.callbacks=new Map,this.worker=t,this.blobUrl=e,this.worker.onmessage=i=>{let o=i.data,r=o.id,s=this.callbacks.get(o.id);s&&(s({time:o.time}),this.callbacks.delete(r))},this.log=(...i)=>this.send("log",...i),this.table=(...i)=>this.send("table",...i),this.clear=(...i)=>this.send("clear",...i)}async send(t,...e){let i=td();return new Promise((o,r)=>{this.callbacks.set(i,o),this.worker.postMessage({id:i,type:t,payload:e}),setTimeout(()=>{r(new Error("timeout")),this.callbacks.delete(i)},2e3)})}destroy(){this.worker.terminate(),URL.revokeObjectURL(this.blobUrl)}};Wa.workerScript=ed;var or=Wa;p();function nr(n){return typeof window<"u"&&console?console[n]:(...t)=>{}}var Ba=nr("log"),rr=nr("table"),ja=nr("clear");p();async function sr(){if(typeof navigator<"u"&&navigator.brave&&navigator.brave.isBrave)try{return await Promise.race([navigator.brave.isBrave(),new Promise(n=>setTimeout(()=>n(!1),1e3))])}catch{return!0}return!1}p();function Ga(n){return n.excludes.some(t=>t())?!1:n.includes.some(t=>t())}var yo=class{constructor(t={}){if(this.isOpen=!1,this.checkCount=0,this.maxChecks=10,this.maxPrintTime=0,this.largeObjectArray=null,this.options={onDetected:t.onDetected||(()=>{}),onClosed:t.onClosed||(()=>{}),interval:t.interval||1e3,enableDebuggerDetection:t.enableDebuggerDetection||!1},!et.UA.Firefox)try{let e=new Blob([or.workerScript],{type:"application/javascript"}),i=URL.createObjectURL(e),o=new Worker(i);this.workerConsole=new or(o,i)}catch(e){console.warn("Failed to create Web Worker for DevTools detection:",e)}this.startDetection()}createLargeObjectArray(){let t={};for(let i=0;i<500;i++)t[`${i}`]=`${i}`;let e=[];for(let i=0;i<50;i++)e.push(t);return e}getLargeObjectArray(){return this.largeObjectArray===null&&(this.largeObjectArray=this.createLargeObjectArray()),this.largeObjectArray}async calcTablePrintTime(){let t=this.getLargeObjectArray();if(this.workerConsole)try{return(await this.workerConsole.table(t)).time}catch{let e=performance.now();return rr(t),performance.now()-e}else{let e=performance.now();return rr(t),performance.now()-e}}async calcLogPrintTime(){let t=this.getLargeObjectArray();if(this.workerConsole)return(await this.workerConsole.log(t)).time;{let e=performance.now();return Ba(t),performance.now()-e}}isPerformanceDetectionEnabled(){return Ga({includes:[()=>!!et.UA.Chrome,()=>!!et.UA.Chromium,()=>!!et.UA.Safari,()=>!!et.UA.Firefox],excludes:[]})}isDebuggerDetectionEnabled(){return this.options.enableDebuggerDetection}async checkPerformanceBased(){if(!this.isPerformanceDetectionEnabled())return!1;let t=await this.calcTablePrintTime(),e=Math.max(await this.calcLogPrintTime(),await this.calcLogPrintTime());return this.maxPrintTime=Math.max(this.maxPrintTime,e),this.workerConsole?await this.workerConsole.clear():ja(),t===0?!1:this.maxPrintTime===0?!!await sr():t>this.maxPrintTime*10}async checkDebuggerBased(){if(!this.isDebuggerDetectionEnabled()||await sr())return!1;let t=performance.now();try{(()=>{}).constructor("debugger")()}catch{debugger}return performance.now()-t>100}async detectDevTools(){return await this.checkPerformanceBased()?!0:this.options.enableDebuggerDetection&&this.checkCount>=this.maxChecks?await this.checkDebuggerBased():!1}startDetection(){this.intervalId=window.setInterval(async()=>{this.checkCount++;let t=await this.detectDevTools();t!==this.isOpen&&(this.isOpen=t,t?this.options.onDetected():this.options.onClosed()),this.checkCount>this.maxChecks*2&&(this.checkCount=0)},this.options.interval),window.addEventListener("beforeunload",()=>this.destroy())}isDevToolsOpen(){return this.isOpen}async checkNow(){let t=this.isOpen;return this.isOpen=await this.detectDevTools(),this.isOpen!==t&&(this.isOpen?this.options.onDetected():this.options.onClosed()),this.isOpen}destroy(){this.intervalId&&(clearInterval(this.intervalId),this.intervalId=void 0),this.workerConsole&&(this.workerConsole.destroy(),this.workerConsole=void 0),this.isOpen=!1,this.checkCount=0}};p();var _o=class{constructor(t){if(this.detected=!1,!t.onDetected)throw new Error("onDetected callback is required");this.options=t,this.setupDetection()}isIframed(){try{return window.self!==window.top?{isEmbedded:!0,isCrossOrigin:!window.top.location.href}:{isEmbedded:!1,isCrossOrigin:!1}}catch{return{isEmbedded:!0,isCrossOrigin:!0}}}setupDetection(){let{isEmbedded:t,isCrossOrigin:e}=this.isIframed();if(t){this.handleDetected(e);return}this.observer=new MutationObserver(()=>{var r;let{isEmbedded:i,isCrossOrigin:o}=this.isIframed();i&&!this.detected&&(this.handleDetected(o),(r=this.observer)==null||r.disconnect())}),this.observer.observe(document.documentElement,{childList:!0,subtree:!0,attributes:!0}),window.addEventListener("unload",()=>this.destroy())}handleDetected(t){var e,i;this.detected=!0,(i=(e=this.options).onDetected)==null||i.call(e,t)}destroy(){var t;(t=this.observer)==null||t.disconnect(),this.observer=void 0,this.detected=!1}};p();var bo=class{constructor(t={}){this.styleElement=null,this.beforePrintHandler=null,this.onPrintAttempt=t.onPrintAttempt,t.disable&&this.setupPrintProtection(t.watermark)}setupPrintProtection(t){let e=document.createElement("style");e.textContent=`
            @media print {
                body * {
                    display: none !important;
                }
                body::after {
                    content: "${t||"Printing has been disabled"}";
                    font-size: 200%;
                    display: block;
                    text-align: center;
                    margin-top: 50vh;
                    transform: translateY(-50%);
                }
            }
        `,document.head.appendChild(e),this.styleElement=e,this.beforePrintHandler=i=>{var o;return i.preventDefault(),(o=this.onPrintAttempt)==null||o.call(this),!1},window.addEventListener("beforeprint",this.beforePrintHandler)}destroy(){var t;this.beforePrintHandler&&(window.removeEventListener("beforeprint",this.beforePrintHandler),this.beforePrintHandler=null),(t=this.styleElement)!=null&&t.parentNode&&(this.styleElement.parentNode.removeChild(this.styleElement),this.styleElement=null)}};p();var vo=class{constructor(t={}){this.onContextMenuBlocked=t.onContextMenuBlocked,this.contextMenuHandler=this.handleContextMenu.bind(this),document.addEventListener("contextmenu",this.contextMenuHandler,!0),window.addEventListener("unload",()=>this.destroy())}handleContextMenu(t){t.preventDefault(),t.stopPropagation();let e={type:"context_menu",timestamp:Date.now(),clientX:t.clientX,clientY:t.clientY,targetFrameSrc:""};return this.onContextMenuBlocked&&this.onContextMenuBlocked(e),!1}destroy(){this.contextMenuHandler&&(document.removeEventListener("contextmenu",this.contextMenuHandler,!0),this.contextMenuHandler=void 0)}};var Ro="readium:navigator:suspiciousActivity",wo=class{dispatchSuspiciousActivity(t,e){let i=new CustomEvent(Ro,{detail:{type:t,timestamp:Date.now(),...e}});window.dispatchEvent(i)}constructor(t={}){var e;t.monitorDevTools&&(this.devToolsDetector=new yo({onDetected:()=>{this.dispatchSuspiciousActivity("developer_tools",{targetFrameSrc:"",key:"",code:"",keyCode:-1,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1})}})),t.checkAutomation&&(this.automationDetector=new So({onDetected:i=>{this.dispatchSuspiciousActivity("automation_detected",{tool:i})}})),t.checkIFrameEmbedding&&(this.iframeEmbeddingDetector=new _o({onDetected:i=>{this.dispatchSuspiciousActivity("iframe_embedding_detected",{isCrossOrigin:i})}})),(e=t.protectPrinting)!=null&&e.disable&&(this.printProtector=new bo({...t.protectPrinting,onPrintAttempt:()=>{this.dispatchSuspiciousActivity("print",{})}})),t.disableContextMenu&&(this.contextMenuProtector=new vo({onContextMenuBlocked:i=>{this.dispatchSuspiciousActivity("context_menu",i)}}))}destroy(){var t,e,i,o,r;(t=this.automationDetector)==null||t.destroy(),(e=this.devToolsDetector)==null||e.destroy(),(i=this.iframeEmbeddingDetector)==null||i.destroy(),(o=this.printProtector)==null||o.destroy(),(r=this.contextMenuProtector)==null||r.destroy()}};p();var Eo="readium:navigator:keyboardPeripheral",Co=class{constructor(t={}){this.keyManager=new _e,this.pagehideHandler=e=>{e.persisted||this.destroy()},this.dispatcher=e=>{let i=new CustomEvent(Eo,{detail:e});window.dispatchEvent(i)},this.conditionBridge=new oe(t.keyboardPeripherals||[],e=>this.setupKeyboardPeripherals(e)),this.conditionBridge.setup(),window.addEventListener("pagehide",this.pagehideHandler)}setupKeyboardPeripherals(t){this.removeKeydownHandler(),t.length!==0&&(this.keydownHandler=this.keyManager.createUnifiedHandler("",t,this.dispatcher),document.addEventListener("keydown",this.keydownHandler,!0))}removeKeydownHandler(){this.keydownHandler&&(document.removeEventListener("keydown",this.keydownHandler,!0),this.keydownHandler=void 0)}destroy(){this.conditionBridge.destroy(),this.removeKeydownHandler(),window.removeEventListener("pagehide",this.pagehideHandler)}};p();p();p();var Va=n=>n.split(/[?#]/)[0],id=n=>{let t=Va(n);if(t.endsWith("/"))return t;try{let e=new URL(t);return e.pathname=e.pathname.substring(0,e.pathname.lastIndexOf("/")+1),e.href}catch{return t.replace(/[^/]*$/,"")}},od=(n,t="always",e)=>{let i=t==="always"||(t==="never"?!1:typeof e=="string"&&e.startsWith("https:")),o=n.join(" ");return[...i?["upgrade-insecure-requests"]:[],`default-src ${o} blob:`,"connect-src 'none'",`script-src ${o} blob: 'unsafe-inline'`,`style-src ${o} blob: 'unsafe-inline'`,`img-src ${o} blob: data:`,`font-src ${o} blob: data:`,`object-src ${o} blob:`,`child-src ${o}`,"form-action 'none'"].join("; ")},Ye=class{constructor(t,e,i,o){var r,s;this.pub=t,this.baseURL=e,this.item=i,this.injector=null,this.item=i,this.cssProperties=o.cssProperties,this.injector=(r=o.injector)!=null?r:null,this.upgradeInsecureRequests=(s=o.upgradeInsecureRequests)!=null?s:"always"}reset(){var t;this.currentUrl&&URL.revokeObjectURL(this.currentUrl),this.currentUrl=void 0,(t=this.currentResource)==null||t.close(),this.currentResource=void 0,this.pendingBuild=void 0}async build(t=!1){if(this.currentUrl)return this.currentUrl;if(this.pendingBuild)return this.pendingBuild;let e=this.doBuild(t).finally(()=>{this.pendingBuild===e&&(this.pendingBuild=void 0)});return this.pendingBuild=e,e}async doBuild(t){this.currentResource=this.pub.get(this.item);let e=await this.currentResource.link();if(!this.currentResource)return"about:blank";if(e.mediaType.isHTML){let i=await this.buildHtmlFrame(t);return this.currentUrl=i,i}else if(e.mediaType.isBitmap||e.mediaType.equals(rt.SVG)){let i=await this.buildImageFrame();return this.currentUrl=i,i}else throw Error("Unsupported frame mediatype "+e.mediaType.string)}async buildHtmlFrame(t=!1){if(!this.currentResource)throw new Error("No resource loaded");let e=await this.currentResource.link(),i=await this.currentResource.readAsXML();if(!i)throw new Error(`Failed reading item ${e.href}`);let o=i.querySelector("parsererror");if(o){let r=o.querySelector("div");throw new Error(`Failed parsing item ${e.href}: ${(r==null?void 0:r.textContent)||o.textContent}`)}return this.injector&&await this.injector.injectForDocument(i,e),this.finalizeDOM(i,this.pub.baseURL,e.toURL(this.baseURL)||"",e.mediaType,t,this.cssProperties,this.upgradeInsecureRequests)}async buildImageFrame(){if(!this.currentResource)throw new Error("No resource loaded");let t=await this.currentResource.link(),e=t.toURL(this.baseURL)||"",i=document.implementation.createHTMLDocument(t.title||t.href);if(((t==null?void 0:t.height)||0)>0&&((t==null?void 0:t.width)||0)>0){let s=i.createElement("meta");s.name="viewport",s.content=`width=${t.width}, height=${t.height}`,s.dataset.readium="true",i.head.appendChild(s)}let o=document.createElement("img");o.src=e||"",o.alt=t.title||"",await o.decode(),i.body.appendChild(o),this.injector&&await this.injector.injectForDocument(i,new at({href:"readium-image-frame.xhtml",type:rt.XHTML.string}));let r=i.createElement("style");return r.dataset.readium="true",r.textContent=`
        html, body { width: 100%; height: 100%; margin: 0; padding: 0; font-size: 0; }
        img { margin: 0; padding: 0; border: 0; }`,i.head.appendChild(r),this.finalizeDOM(i,this.pub.baseURL,e,t.mediaType,!0,void 0,this.upgradeInsecureRequests)}async buildBlankFrame(t,e){let i=document.implementation.createHTMLDocument(this.item.title||this.item.href),o=i.createElement("meta");return o.name="viewport",o.content=`width=${t}, height=${e}`,o.dataset.readium="true",i.head.appendChild(o),this.injector&&await this.injector.injectForDocument(i,this.item.mediaType.isHTML?this.item:new at({href:"readium-image-frame.xhtml",type:rt.XHTML.string})),this.reset(),this.currentUrl=this.finalizeDOM(i,this.pub.baseURL,this.item.toURL(this.baseURL)||"",rt.XHTML,!0,void 0,this.upgradeInsecureRequests),this.currentUrl}setProperties(t,e){for(let i in t){let o=t[i];o&&e.documentElement.style.setProperty(i,o)}}finalizeDOM(t,e,i,o,r=!1,s,a="always"){var u,m,g;if(!t)return"";let l=(((m=(u=this.injector)==null?void 0:u.getAllowedDomains)==null?void 0:m.call(u))||[]).map(Va),h=e?id(e):void 0,c=[...new Set([...h?[h]:[],...l])].filter(Boolean);if(s&&!r&&this.setProperties(s,t),t.body.querySelectorAll("img").forEach(b=>{b.setAttribute("fetchpriority","high"),b.setAttribute("referrerpolicy","origin")}),o.isHTML&&((g=this.pub.metadata.languages)==null?void 0:g[0])){let b=this.pub.metadata.languages[0];if(o===rt.XHTML){let S=t.documentElement.lang||t.documentElement.getAttribute("xml:lang"),y=t.body.lang||t.body.getAttribute("xml:lang");y&&!S?(t.documentElement.lang=y,t.documentElement.setAttribute("xml:lang",y),t.body.removeAttribute("xml:lang"),t.body.removeAttribute("lang")):S||(t.documentElement.lang=b,t.documentElement.setAttribute("xml:lang",b))}else o===rt.HTML&&!t.documentElement.lang&&(t.documentElement.lang=b)}if(ne(this.pub.metadata)==="rtl"&&!t.documentElement.dir&&!t.body.dir&&(t.documentElement.dir=D.rtl),i!==void 0){let b=t.createElement("base");b.href=i,b.dataset.readium="true",t.head.prepend(b)}let d=t.createElement("meta");return d.httpEquiv="Content-Security-Policy",d.content=od(c,a,e),d.dataset.readium="true",t.head.prepend(d),URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(t)],{type:o.isHTML?o.string:"application/xhtml+xml"}))}};p();var Dt=class{constructor(t,e={},i=[],o=[],r=[]){this.timelineFragmentIds=o,this.hidden=!0,this.destroyed=!1,this.pendingUnwatchSelectors=[],this.currModules=[],this.serialize=ho(),this.frame=document.createElement("iframe"),this.frame.sandbox.value="allow-same-origin allow-scripts",this.frame.classList.add("readium-navigator-iframe"),this.frame.style.visibility="hidden",this.frame.ariaHidden="true",this.frame.style.opacity="0",this.frame.style.position="absolute",this.frame.style.pointerEvents="none",this.frame.style.transition="visibility 0s, opacity 0.1s linear",this.source=t,this.contentProtectionConfig={...e},this.keyboardPeripheralsConfig=[...i],this.resizeWatchSelectors=[...r]}async load(t){return this.serialize(()=>new Promise((e,i)=>{var o,r;if(this.loader){let s=this.frame.contentWindow;if([...this.currModules].sort().join("|")===[...t].sort().join("|")){try{e(s)}catch{}return}(o=this.comms)==null||o.halt(),this.loader.destroy(),this.loader=new Xt(s,t),this.currModules=t,this.comms=void 0,(r=this.conditionBridge)==null||r.destroy();try{e(s)}catch{}return}this.frame.onload=()=>{let s=this.frame.contentWindow;this.loader=new Xt(s,t),this.currModules=t;try{e(s)}catch{}},this.frame.onerror=s=>{try{i(s)}catch{}},this.frame.contentWindow.location.replace(this.source)}))}applyContentProtection(){var t,e;this.comms||this.comms.resume(),this.comms.send("peripherals_protection",this.contentProtectionConfig),this.keyboardPeripheralsConfig&&this.keyboardPeripheralsConfig.length>0&&((t=this.conditionBridge)==null||t.destroy(),this.conditionBridge=new oe(this.keyboardPeripheralsConfig,i=>{i.length>0&&this.comms.send("keyboard_peripherals",i)}),this.conditionBridge.setup()),this.contentProtectionConfig.monitorScrollingExperimental&&this.comms.send("scroll_protection",{}),(e=this.contentProtectionConfig.protectPrinting)!=null&&e.disable&&this.comms.send("print_protection",this.contentProtectionConfig.protectPrinting),this.resizeWatchSelectors.forEach(i=>{this.comms.send("decoration_resize",{action:"watch",selector:i})}),this.pendingUnwatchSelectors.forEach(i=>{this.comms.send("decoration_resize",{action:"unwatch",selector:i})}),this.pendingUnwatchSelectors=[]}addResizeTarget(t){var e;this.resizeWatchSelectors.includes(t)||this.resizeWatchSelectors.push(t),this.pendingUnwatchSelectors=this.pendingUnwatchSelectors.filter(i=>i!==t),(e=this.comms)!=null&&e.ready&&this.comms.send("decoration_resize",{action:"watch",selector:t})}removeResizeTarget(t){var e;this.resizeWatchSelectors=this.resizeWatchSelectors.filter(i=>i!==t),(e=this.comms)!=null&&e.ready?this.comms.send("decoration_resize",{action:"unwatch",selector:t}):this.pendingUnwatchSelectors.includes(t)||this.pendingUnwatchSelectors.push(t)}async destroy(){return this.serialize(async()=>{var t,e;(t=this.conditionBridge)==null||t.destroy(),await this.hideNow(),(e=this.loader)==null||e.destroy(),this.frame.remove(),this.destroyed=!0})}async hide(){return this.serialize(()=>this.hideNow())}async hideNow(){var t;if(!this.destroyed){if(this.frame.style.visibility="hidden",this.frame.ariaHidden="true",this.frame.style.opacity="0",this.frame.style.pointerEvents="none",this.hidden=!0,this.frame.blur(),this.frame.parentElement)return this.comms===void 0||!this.comms.ready?void 0:new Promise((e,i)=>{var o;(o=this.comms)==null||o.send("unfocus",void 0,r=>{var s;(s=this.comms)==null||s.halt(),e()})});(t=this.comms)==null||t.halt()}}async show(t){return this.serialize(()=>this.showNow(t))}async showNow(t){if(this.destroyed)throw Error("Trying to show frame when it doesn't exist");if(!this.frame.parentElement)throw Error("Trying to show frame that is not attached to the DOM");return this.comms?this.comms.resume():this.comms=new we(this.frame.contentWindow,this.source),new Promise((e,i)=>{var o;(o=this.comms)==null||o.send("activate",void 0,()=>{var r;(r=this.comms)==null||r.send("focus",void 0,()=>{var a,l;this.applyContentProtection(),this.timelineFragmentIds.length>0&&((a=this.comms)==null||a.send("timeline_entries",this.timelineFragmentIds));let s=()=>{var h;this.frame.style.removeProperty("visibility"),this.frame.style.removeProperty("opacity"),this.frame.style.removeProperty("pointer-events"),this.frame.ariaHidden=null,this.hidden=!1,et.UA.WebKit&&((h=this.comms)==null||h.send("force_webkit_recalc",void 0)),e()};t!==void 0?(l=this.comms)==null||l.send("go_progression",t,s):s()})})})}setCSSProperties(t){var e;this.destroyed||!this.frame.contentWindow||(this.hidden&&!this.comms&&(this.comms=new we(this.frame.contentWindow,this.source),this.comms.halt()),(e=this.comms)==null||e.send("update_properties",t))}get iframe(){if(this.destroyed)throw Error("Trying to use frame when it doesn't exist");return this.frame}get realSize(){if(this.destroyed)throw Error("Trying to use frame client rect when it doesn't exist");return this.frame.getBoundingClientRect()}get isDestroyed(){return this.destroyed}get window(){if(this.destroyed||!this.frame.contentWindow)throw Error("Trying to use frame window when it doesn't exist");return this.frame.contentWindow}get atLeft(){return this.window.scrollX<5}get atRight(){return this.window.scrollX>this.window.document.scrollingElement.scrollWidth-this.window.innerWidth-5}get msg(){return this.comms}get ldr(){return this.loader}};var $a=10,Xa=5,xo=class{constructor(t,e,i,o,r,s,a,l=[],h){this.pool=new Map,this.blobs=new Map,this.inprogress=new Map,this.pendingUpdates=new Map,this.injector=null,this.updateSequence=0,this.container=t,this.positions=e,this.currentCssProperties=i,this.injector=o!=null?o:null,this.contentProtectionConfig=r||{},this.keyboardPeripheralsConfig=s||[],this.getFragmentIds=a!=null?a:()=>[],this.resizeWatchSelectors=[...l],this.upgradeInsecureRequests=h!=null?h:"always"}addResizeTarget(t){this.resizeWatchSelectors.includes(t)||this.resizeWatchSelectors.push(t),this.pool.forEach(e=>e.addResizeTarget(t))}removeResizeTarget(t){this.resizeWatchSelectors=this.resizeWatchSelectors.filter(e=>e!==t),this.pool.forEach(e=>e.removeResizeTarget(t))}async destroy(){var s;let t=this.inprogress.values(),e=t.next(),i=[];for(;e.value;)i.push(e.value),e=t.next();i.length>0&&await Promise.allSettled(i),this.inprogress.clear();let o=this.pool.values(),r=o.next();for(;r.value;)await r.value.destroy(),r=o.next();this.pool.clear(),this.blobs.forEach(a=>a.reset()),this.blobs.clear(),(s=this.injector)==null||s.dispose(),this.container.childNodes.forEach(a=>{(a.nodeType===Node.ELEMENT_NODE||a.nodeType===Node.TEXT_NODE)&&a.remove()})}async update(t,e,i,o=!1){for(;this.forcedUpdate;)await this.forcedUpdate;let r=++this.updateSequence,s=this.positions.findIndex(h=>h.locations.position===e.locations.position);if(s<0)throw Error(`Locator not found in position list: ${e.locations.position} > ${this.positions.reduce((h,c)=>c.locations.position||0>h?c.locations.position||0:h,0)}`);let a=this.positions[s].href;this.inprogress.has(a)&&await this.inprogress.get(a);let l=new Promise(async(h,c)=>{var b,S;let d=[],u=[];this.positions.forEach((y,f)=>{(f>s+$a||f<s-$a)&&(d.includes(y.href)||d.push(y.href)),f<s+Xa&&f>s-Xa&&(u.includes(y.href)||u.push(y.href))}),d.forEach(async y=>{var f;u.includes(y)||this.pool.has(y)&&(await((f=this.pool.get(y))==null?void 0:f.destroy()),this.pool.delete(y),this.pendingUpdates.has(y)&&this.pendingUpdates.set(y,{inPool:!1}))}),this.currentBaseURL!==void 0&&t.baseURL!==this.currentBaseURL&&(this.blobs.forEach(y=>y.reset()),this.blobs.clear()),this.currentBaseURL=t.baseURL,o&&(this.blobs.forEach(y=>y.reset()),this.blobs.clear(),this.pendingUpdates.clear());let m=async y=>{var R;if(this.pendingUpdates.has(y)&&((R=this.pendingUpdates.get(y))==null?void 0:R.inPool)===!1){let v=this.blobs.get(y);v&&(v.reset(),this.blobs.delete(y),this.pendingUpdates.delete(y))}if(this.pool.has(y)){let v=this.pool.get(y);if(!this.blobs.has(y))await v.destroy(),this.pool.delete(y),this.pendingUpdates.delete(y);else{await v.load(i);return}}let f=t.readingOrder.findWithHref(y);if(!f)return;this.blobs.has(y)||this.blobs.set(y,new Ye(t,this.currentBaseURL||"",f,{cssProperties:this.currentCssProperties,injector:this.injector,upgradeInsecureRequests:this.upgradeInsecureRequests}));let w=new Dt(await this.blobs.get(y).build(),this.contentProtectionConfig,this.keyboardPeripheralsConfig,this.getFragmentIds(y),this.resizeWatchSelectors);return y!==a&&await w.hide(),this.container.appendChild(w.iframe),await w.load(i),this.pool.set(y,w),w};try{await Promise.all(u.filter(y=>y===a).map(y=>m(y)))}catch(y){c(y);return}if(r!==this.updateSequence){h();return}Promise.all(u.filter(y=>y!==a&&!this.inprogress.has(y)).map(async y=>{let f=m(y);this.inprogress.set(y,f);try{await f}finally{this.inprogress.get(y)===f&&this.inprogress.delete(y)}})).catch(y=>console.warn("Failed preloading frame",y));let g=this.pool.get(a);if(!g){h();return}if((g==null?void 0:g.source)!==((b=this._currentFrame)==null?void 0:b.source)||o){if(await((S=this._currentFrame)==null?void 0:S.hide()),r!==this.updateSequence){h();return}let y=this.pool.get(a);if(!y){h();return}if(await y.load(i),r!==this.updateSequence){h();return}let f=this.pool.get(a);if(!f){h();return}if(await f.show(e.locations.progression),this._currentFrame=f,g){let w=this.container.ownerDocument.activeElement;w&&w.tagName==="IFRAME"&&w!==g.iframe&&g.iframe.focus({preventScroll:!0})}}h()});if(this.inprogress.set(a,l),o){let h=l.catch(()=>{});this.forcedUpdate=h,h.then(()=>{this.forcedUpdate===h&&(this.forcedUpdate=void 0)})}try{await l}finally{this.inprogress.delete(a)}}setCSSProperties(t){if(!((e,i)=>{let o=Object.keys(e),r=Object.keys(i);if(o.length!==r.length)return!1;for(let s of o)if(e[s]!==i[s])return!1;return!0})(this.currentCssProperties||{},t)){this.currentCssProperties=t,this.pool.forEach(e=>{e.setCSSProperties(t)});for(let e of this.blobs.keys())this.pendingUpdates.set(e,{inPool:this.pool.has(e)})}}get currentFrames(){return[this._currentFrame]}_frameFor(t){return this.pool.get(t)}get currentBounds(){let t={x:0,y:0,width:0,height:0,top:0,right:0,bottom:0,left:0,toJSON(){return this}};return this.currentFrames.forEach(e=>{if(!e)return;let i=e.realSize;t.x=Math.min(t.x,i.x),t.y=Math.min(t.y,i.y),t.width+=i.width,t.height=Math.max(t.height,i.height),t.top=Math.min(t.top,i.top),t.right=Math.min(t.right,i.right),t.bottom=Math.min(t.bottom,i.bottom),t.left=Math.min(t.left,i.left)}),t}};p();p();p();p();var nd=(n=>(n[n.Left=0]="Left",n[n.Center=1]="Center",n[n.Right=2]="Right",n))(nd||{}),rd=(n=>(n[n.Top=0]="Top",n[n.Middle=1]="Middle",n[n.Bottom=2]="Bottom",n))(rd||{}),Po=class{constructor(){this.outerWidth=0,this.outerHeight=0,this.HTML=document.documentElement,this.Head=document.head,this.Body=document.body}refreshOuterPixels(t){et.OS.iOS||(this.outerHeight=window.outerHeight-window.innerHeight,et.OS.Android&&et.UA.Chrome&&window.screen.height>window.innerHeight&&(this.outerHeight=(window.screen.height-window.innerHeight)/1.5),this.outerWidth=window.outerWidth-window.innerWidth)}getBibiEventCoord(t,e=0){var o;let i={X:0,Y:0};return/^touch/.test(t.type)?(i.X=t.touches[e].screenX,i.Y=t.touches[e].screenY):(i.X=t.screenX,i.Y=t.screenY),(((o=t.target.ownerDocument)==null?void 0:o.documentElement)||t.target.documentElement)===this.HTML&&(i.X-=this.HTML.scrollLeft+this.Body.scrollLeft,i.Y-=this.HTML.scrollTop+this.Body.scrollTop),i.X-=this.outerWidth,i.Y-=this.outerHeight,i}getTouchDistance(t){if(t.touches.length!==2)return 0;let e=t.touches[0].screenX-this.outerWidth,i=t.touches[0].screenY-this.outerHeight,o=t.touches[1].screenX-this.outerWidth,r=t.touches[1].screenY-this.outerHeight;return Math.sqrt(Math.pow(o-e,2)+Math.pow(r-i,2))}getTouchCenter(t){if(t.touches.length!==2)return null;let e=this.HTML.scrollLeft+this.Body.scrollLeft,i=this.HTML.scrollTop+this.Body.scrollTop,o=t.touches[0].screenX-this.outerWidth-e,r=t.touches[0].screenY-this.outerHeight-i,s=t.touches[1].screenX-this.outerWidth-e,a=t.touches[1].screenY-this.outerHeight-i;return{X:(o+s)/2,Y:(r+a)/2}}getBibiEvent(t){if(!t)return{Coord:null,Division:null,Ratio:null,Target:null};let e=this.getBibiEventCoord(t),i=.3,o={X:e.X/window.innerWidth,Y:e.Y/window.innerHeight},r,s,a,l;a=r=i,l=s=1-i;let h={X:null,Y:null};return o.X<a?h.X=0:l<o.X?h.X=2:h.X=1,o.Y<r?h.Y=0:s<o.Y?h.Y=2:h.Y=1,{Target:t.target,Coord:e,Ratio:o,Division:h}}};p();var Fo=class{constructor(){this._DOM={show:!1,pinchTarget:document.createElement("div"),touch1:document.createElement("div"),touch2:document.createElement("div"),center:document.createElement("div"),stats:document.createElement("div")},this._DOM.show=!0,this._DOM.pinchTarget.style.zIndex=this._DOM.stats.style.zIndex=this._DOM.center.style.zIndex=this._DOM.touch1.style.zIndex=this._DOM.touch2.style.zIndex="100000",this._DOM.pinchTarget.style.position=this._DOM.stats.style.position=this._DOM.center.style.position=this._DOM.touch1.style.position=this._DOM.touch2.style.position="absolute",this._DOM.pinchTarget.style.borderRadius=this._DOM.center.style.borderRadius=this._DOM.touch1.style.borderRadius=this._DOM.touch2.style.borderRadius="50%",this._DOM.pinchTarget.style.pointerEvents=this._DOM.stats.style.pointerEvents=this._DOM.center.style.pointerEvents=this._DOM.touch1.style.pointerEvents=this._DOM.touch2.style.pointerEvents="none",this._DOM.pinchTarget.style.display=this._DOM.center.style.display=this._DOM.touch1.style.display=this._DOM.touch2.style.display="none",this._DOM.pinchTarget.style.paddingTop=this._DOM.center.style.paddingTop="10px",this._DOM.pinchTarget.style.width=this._DOM.pinchTarget.style.height=this._DOM.center.style.width=this._DOM.center.style.height="10px",this._DOM.pinchTarget.style.backgroundColor="green",this._DOM.center.style.backgroundColor="red",this._DOM.touch1.style.backgroundColor=this._DOM.touch2.style.backgroundColor="blue",this._DOM.touch1.style.height=this._DOM.touch2.style.height="20px",this._DOM.touch1.style.width=this._DOM.touch2.style.width="20px",this._DOM.touch1.style.paddingTop=this._DOM.touch2.style.paddingTop="20px",this._DOM.touch1.textContent="1",this._DOM.touch2.textContent="2",this._DOM.stats.style.padding="20px",this._DOM.stats.style.backgroundColor="rgba(0,0,0,0.5)",this._DOM.stats.style.color="white",this._DOM.stats.textContent="[stats]",document.body.appendChild(this._DOM.stats),document.body.appendChild(this._DOM.center),document.body.appendChild(this._DOM.touch1),document.body.appendChild(this._DOM.touch2),document.body.appendChild(this._DOM.pinchTarget)}get show(){return this.DOM.show}get DOM(){return this._DOM}};var Ka=6,ar=1.02,Ya=50,Tt=()=>typeof window.CSSTransformValue<"u",ko=class{constructor(t,e=!1){this.dragState=0,this.minimumMoved=!1,this.pan={startX:0,endX:0,startY:0,overscrollX:0,overscrollY:0,letItGo:!1,preventClick:!1,translateX:0,translateY:0,touchID:0},this.pinch={startDistance:0,startScale:0,target:{X:0,Y:0},touchN:0,startTranslate:{X:0,Y:0}},this._scale=1,this.scaleDebouncer=0,this.frameBounds=null,this.debugger=null,this.btouchstartHandler=this.touchstartHandler.bind(this),this.btouchendHandler=this.touchendHandler.bind(this),this.btouchmoveHandler=this.touchmoveHandler.bind(this),this.bdblclickHandler=this.dblclickHandler.bind(this),this.bmousedownHandler=this.mousedownHandler.bind(this),this.bmouseupHandler=this.mouseupHandler.bind(this),this.bmousemoveHandler=this.mousemoveHandler.bind(this),this.moveFrame=0,this.dragTranslate=null,this.dragTransform=null,this.manager=t,this.coordinator=new Po,this.attachEvents(),e&&(this.debugger=new Fo)}get scale(){return this._scale}set scale(t){isNaN(t)&&(t=1),window.clearTimeout(this.scaleDebouncer),this.scaleDebouncer=window.setTimeout(()=>{this.dragState===0&&this.scale<ar&&(this.pan.translateX=0,this.pan.translateY=0,this.clearPan(),this.manager.updateBookStyle()),this.manager.listener("zoom",t)},100),this._scale=t}attachEvents(){this.observe(this.manager.spineElement),this.pan={startX:0,startY:0,endX:0,overscrollX:0,overscrollY:0,letItGo:!1,preventClick:!1,translateX:0,translateY:0,touchID:0},this.pinch={startDistance:0,startScale:0,target:{X:0,Y:0},startTranslate:{X:0,Y:0},touchN:0}}clearPan(){this.pan.letItGo=!1,this.pan.touchID=0,this.pan.endX=0,this.pan.overscrollX=0,this.pan.overscrollY=0}clearPinch(){this.pinch={startDistance:0,startScale:this.pinch.startScale,target:{X:0,Y:0},touchN:0,startTranslate:{X:0,Y:0}}}observe(t){t.addEventListener("touchstart",this.btouchstartHandler),t.addEventListener("touchend",this.btouchendHandler),t.addEventListener("touchmove",this.btouchmoveHandler,{passive:!0}),t.addEventListener("dblclick",this.bdblclickHandler,{passive:!0}),t.addEventListener("mousedown",this.bmousedownHandler),t.addEventListener("mouseup",this.bmouseupHandler),t.addEventListener("mousemove",this.bmousemoveHandler)}clickHandler(t){}touchstartHandler(t){var i,o;if(["TEXTAREA","OPTION","INPUT","SELECT"].indexOf(t.target.nodeName)!==-1)return;switch(t.stopPropagation(),this.frameBounds=this.manager.currentBounds,this.coordinator.refreshOuterPixels(this.frameBounds),t.touches.length){case 3:return;case 2:{t.preventDefault(),this.pinch.startDistance=this.coordinator.getTouchDistance(t);let r=this.startTouch(t);this.pan.startX=r.X,this.pan.startY=r.Y,this.dragState=2,this.manager.updateBookStyle(!0),this.isScaled?(this.pinch.target.X-=this.pan.translateX*(this.pinch.startScale/this.scale),this.pinch.target.Y-=this.pan.translateY*(this.pinch.startScale/this.scale),this.pinch.target={X:0,Y:0},this.pinch.startScale=1/this.scale):(this.pinch.target={X:0,Y:0},this.pinch.startScale=this.scale),this.pinch.startTranslate={X:this.pan.translateX,Y:this.pan.translateY},(i=this.debugger)!=null&&i.show&&(this.debugger.DOM.touch2.style.display="",this.debugger.DOM.center.style.display="",this.debugger.DOM.pinchTarget.style.display="");return}case 1:this.pan.touchID=t.touches[0].identifier,(o=this.debugger)!=null&&o.show&&(this.debugger.DOM.touch1.style.display="");default:this.dragState<1&&(this.dragState=1),this.manager.updateBookStyle(!0)}this.manager.updateSpineStyle(!1);let e=this.startTouch(t);this.pan.startX=e.X,this.pan.startY=e.Y}startTouch(t){let e=this.coordinator.getTouchCenter(t)||this.coordinator.getBibiEventCoord(t);return{X:e.X-this.manager.width/2-this.pan.translateX*this.scale+this.manager.width/2,Y:e.Y-this.manager.height/2-this.pan.translateY*this.scale+this.manager.height/2}}touchendHandler(t){var e,i;if(t.stopPropagation(),!t.touches||t.touches.length===0)this.pan.endX&&!this.isScaled?(this.pinch.touchN&&(this.pan.endX=this.pan.startX),this.updateAfterDrag()):!this.pinch.touchN&&Math.abs(this.pan.overscrollX)>Ya&&Math.abs(this.pan.overscrollY)<Ya/2&&(this.pan.startX=0,this.pan.endX=-this.pan.overscrollX,this.updateAfterDrag()),this.dragState=0,this.minimumMoved=!1,this.clearPinch(),(e=this.debugger)!=null&&e.show&&(this.debugger.DOM.center.style.display="none",this.debugger.DOM.touch1.style.display="none",this.debugger.DOM.touch2.style.display="none");else if(t.touches.length===1){this.dragState=1,t.touches[0].identifier!==this.pan.touchID&&(this.pan.touchID=t.touches[0].identifier),(i=this.debugger)!=null&&i.show&&(this.debugger.DOM.center.style.display="none",this.debugger.DOM.touch2.style.display="none",this.debugger.DOM.pinchTarget.style.display="none");let o=this.startTouch(t);this.pan.startX=o.X,this.pan.startY=o.Y}window.setTimeout(()=>{this.manager.updateBookStyle(!0),this.dragState===0&&(this.scale<ar&&(this.pan.translateX=0,this.pan.translateY=0),this.clearPan()),this.manager.updateBookStyle(!0)},50)}touchmoveHandler(t){var s,a,l,h,c;t.stopPropagation();let e=this.coordinator.getBibiEventCoord(t);Math.abs(this.pan.startY-e.Y)+Math.abs(this.pan.startX-e.X)>5&&(this.minimumMoved||(this.manager.deselect(),this.minimumMoved=!0),this.dragState<1&&(this.dragState=1));let i=(s=this.coordinator)==null?void 0:s.getTouchDistance(t),o=!1,r=this.scale;if(this.dragState===2&&i){if(this.pinch.touchN++,this.pinch.touchN<4)return;let d=i/this.pinch.startDistance*this.scale;d>=Ka&&(d=Ka),d<=ar&&(d=1),this.scale=d,this.pinch.startDistance=i,o=!0}if(this.pan.letItGo===!1&&(this.pan.letItGo=Math.abs(this.pan.startY-e.Y)<Math.abs(this.pan.startX-e.X)),(a=this.debugger)!=null&&a.show&&(this.debugger.DOM.touch1.style.top=`${e.Y-10}px`,this.debugger.DOM.touch1.style.left=`${e.X-10}px`,this.debugger.DOM.touch1.innerText=`${e.X.toFixed(2)},${e.Y.toFixed(2)}`),this.dragState>0&&this.isScaled||this.dragState>1){if(this.dragState===1){let m={X:e.X-this.manager.width/2,Y:e.Y-this.manager.height/2};this.pan.translateX=(m.X-(this.pan.startX-this.manager.width/2))*1/this.scale,this.pan.translateY=(m.Y-(this.pan.startY-this.manager.height/2))*1/this.scale}else if(this.dragState===2){let m=this.coordinator.getTouchCenter(t);if((l=this.debugger)!=null&&l.show){this.debugger.DOM.center.style.top=`${m.Y-5}px`,this.debugger.DOM.center.style.left=`${m.X-5}px`,this.debugger.DOM.center.innerText=`${m.X.toFixed(2)},${m.Y.toFixed(2)}`;let f=this.coordinator.getBibiEventCoord(t,1);this.debugger.DOM.touch2.style.top=`${f.Y-10}px`,this.debugger.DOM.touch2.style.left=`${f.X-10}px`,this.debugger.DOM.touch2.innerText=`${f.X.toFixed(2)},${f.Y.toFixed(2)}`}m.X-=this.manager.width/2,m.Y-=this.manager.height/2;let g=-m.X/r;g+=m.X/this.scale,this.pinch.target.X+=g,m.X+=this.pinch.target.X*this.scale/this.pinch.startScale;let b=-m.Y/r;b+=m.Y/this.scale,this.pinch.target.Y+=b,m.Y+=this.pinch.target.Y*this.scale/this.pinch.startScale;let S=(m.X-(this.pan.startX-this.manager.width/2))*1/this.scale,y=(m.Y-(this.pan.startY-this.manager.height/2))*1/this.scale;this.pan.translateX=S,this.pan.translateY=y,(h=this.debugger)!=null&&h.show&&(this.debugger.DOM.pinchTarget.style.left=`${this.pinch.target.X*this.scale/this.pinch.startScale-5+this.manager.width/2}px`,this.debugger.DOM.pinchTarget.style.top=`${this.pinch.target.Y*this.scale/this.pinch.startScale-5+this.manager.height/2}px`,this.debugger.DOM.pinchTarget.innerText=`${(this.pinch.target.X*this.scale/this.pinch.startScale).toFixed(2)},${(this.pinch.target.Y*this.scale/this.pinch.startScale).toFixed(2)}`)}let d=this.frameBounds.width/6,u=this.frameBounds.height/6;this.pan.translateX<-d&&(this.pan.overscrollX=-(d+this.pan.translateX),this.pan.translateX=-d),this.pan.translateY<-u&&(this.pan.overscrollY=-(u+this.pan.translateY),this.pan.translateY=-u),this.pan.translateX>d&&(this.pan.overscrollX=d-this.pan.translateX,this.pan.translateX=d),this.pan.translateY>u&&(this.pan.overscrollY=u-this.pan.translateY,this.pan.translateY=u),o=!0,(c=this.debugger)!=null&&c.show&&(this.debugger.DOM.stats.innerText=`TX: ${this.pan.translateX.toFixed(2)}
TY: ${this.pan.translateY.toFixed(2)}
Zoom: ${this.scale.toFixed(2)}
Overscroll: ${this.pan.overscrollX.toFixed(2)},${this.pan.overscrollY.toFixed(2)}`)}if(o){this.manager.updateBookStyle();return}if(this.dragState>0&&this.pan.letItGo){this.pan.endX=e.X;let d=this.manager.currentSlide*(this.manager.width/this.manager.perPage),u=this.pan.endX-this.pan.startX,m=this.manager.rtl?d+u:d-u,g=window.devicePixelRatio||1,b=Math.round((this.manager.rtl?1:-1)*m*g)/g;cancelAnimationFrame(this.moveFrame),this.moveFrame=requestAnimationFrame(()=>{requestAnimationFrame(()=>{Tt()?(this.dragTransform||(this.dragTranslate=new CSSTranslate(CSS.px(0),CSS.px(0),CSS.px(0)),this.dragTransform=new CSSTransformValue([this.dragTranslate])),this.dragTranslate.x.value=b,this.manager.spineElement.attributeStyleMap.set("transform",this.dragTransform)):this.manager.spineElement.style.transform=`translate3d(${b}px, 0, 0)`})})}}dblclickHandler(t){clearTimeout(this.dtimer),this.pdblclick=!0,this.dtimer=window.setTimeout(()=>this.pdblclick=!1,200),!this.disableDblClick&&this.isScaled&&(this.scale=1)}get isScaled(){return this.scale>1}addTouch(t){t.touches=[{pageX:t.pageX,pageY:t.pageY}]}mousedownHandler(t){this.isScaled&&(this.addTouch(t),this.touchstartHandler(t))}mouseupHandler(t){this.isScaled&&this.touchendHandler(t)}mousemoveHandler(t){this.isScaled&&t.buttons>0&&(t.preventDefault(),this.addTouch(t),this.touchmoveHandler(t))}updateAfterDrag(){let t=(this.manager.rtl?-1:1)*(this.pan.endX-this.pan.startX),e=Math.abs(t);t>0&&e>this.manager.threshold&&this.manager.slength>this.manager.perPage?this.manager.listener("no_less",void 0):t<0&&e>this.manager.threshold&&this.manager.slength>this.manager.perPage&&this.manager.listener("no_more",void 0),this.manager.slideToCurrent(!0,!0)}};var To=class{constructor(t,e,i,o={},r=[],s=[]){this.frameIsAppended=!1,this.pendingUnwatchSelectors=[],this.currModules=[],this.viewportSize=void 0,this.serialize=ho(),this.cachedPage=void 0,this.peripherals=t,this.debugHref=i,this.contentProtectionConfig={...o},this.keyboardPeripheralsConfig=[...r],this.resizeWatchSelectors=[...s],this.frame=document.createElement("iframe"),this.frame.sandbox.value="allow-same-origin allow-scripts",this.frame.classList.add("readium-navigator-iframe"),this.frame.classList.add("blank"),this.frame.scrolling="no",this.frame.style.visibility="hidden",this.frame.ariaHidden="true",this.frame.style.display="none",this.frame.style.position="absolute",this.frame.style.pointerEvents="none",this.frame.style.transformOrigin="0 0",this.frame.style.transform="scale(1)",this.frame.style.background="#fff",this.frame.style.touchAction="none",this.frame.dataset.originalHref=i,this.source="about:blank",this.wrapper=document.createElement("div"),this.wrapper.style.position="relative",this.wrapper.style.contain="strict",this.wrapper.style.float=this.wrapper.style.cssFloat=e===D.rtl?"right":"left"}async load(t,e){return this.serialize(()=>this.loadNow(t,e))}async loadNow(t,e){return this.frameIsAppended||(this.wrapper.appendChild(this.frame),this.frameIsAppended=!0),this.source===e&&this.loadPromise&&[...this.currModules].sort().join("|")===[...t].sort().join("|")?this.loadPromise:(this.loaded&&this.source!==e&&this.window.stop(),this.source=e,this.loadPromise=new Promise((i,o)=>{var r,s;if(this.loader&&this.loaded){let a=this.frame.contentWindow;if([...this.currModules].sort().join("|")===[...t].sort().join("|")){try{i(a),this.loadPromise=void 0}catch{}return}(r=this.comms)==null||r.halt(),this.loader.destroy(),this.loader=new Xt(a,t),this.currModules=t,this.comms=void 0,(s=this.conditionBridge)==null||s.destroy();try{i(a),this.loadPromise=void 0}catch{}return}this.frame.addEventListener("load",()=>{let a=this.frame.contentWindow;this.loader=new Xt(a,t),this.currModules=t,this.peripherals.observe(this.wrapper),this.peripherals.observe(a);try{i(a)}catch{}},{once:!0}),this.frame.addEventListener("error",a=>{try{o(a.error),this.loadPromise=void 0}catch{}},{once:!0}),this.frame.style.removeProperty("display"),this.frame.contentWindow.location.replace(this.source)}),this.loadPromise)}loadPageSize(){if(this.viewportSize)return this.viewportSize;let t=this.frame.contentWindow,e=t.document.head.querySelector("meta[name=viewport]");if(e){let i=/(\w+) *= *([^\s,]+)/g,o,r=0,s=0;for(;o=i.exec(e.content);)o[1]==="width"?r=Number.parseFloat(o[2]):o[1]==="height"&&(s=Number.parseFloat(o[2]));if(r>0&&s>0)return this.viewportSize={width:r,height:s},this.viewportSize}return{width:t.document.body.scrollWidth,height:t.document.body.scrollHeight}}update(t){if(!this.loaded)return;let e=this.loadPageSize(),i=Math.min(this.wrapper.clientWidth/e.width,this.wrapper.clientHeight/e.height);Tt()?(this.frame.attributeStyleMap.set("width",CSS.px(e.width)),this.frame.attributeStyleMap.set("height",CSS.px(e.height)),this.frame.attributeStyleMap.set("transform",new CSSTransformValue([new CSSScale(i,i)]))):(this.frame.style.height=`${e.height}px`,this.frame.style.width=`${e.width}px`,this.frame.style.transform=`scale(${i})`);let o=this.frame.getBoundingClientRect(),r=this.wrapper.clientHeight-o.height;if(Tt())if(this.frame.attributeStyleMap.set("top",CSS.px(r/2)),t===st.left){let s=this.wrapper.clientWidth-o.width;this.frame.attributeStyleMap.set("left",CSS.px(s))}else if(t===st.center){let s=this.wrapper.clientWidth-o.width;this.frame.attributeStyleMap.set("left",CSS.px(s/2))}else this.frame.attributeStyleMap.set("left",CSS.px(0));else if(this.frame.style.top=`${r/2}px`,t===st.left){let s=this.wrapper.clientWidth-o.width;this.frame.style.left=`${s}px`}else if(t===st.center){let s=this.wrapper.clientWidth-o.width;this.frame.style.left=`${s/2}px`}else this.frame.style.left="0px";this.frame.style.removeProperty("visibility"),this.frame.ariaHidden=null,this.frame.style.removeProperty("pointer-events"),this.frame.classList.remove("blank"),this.frame.classList.add("loaded")}async destroy(){return this.serialize(async()=>{var t,e;(t=this.conditionBridge)==null||t.destroy(),await this.unfocusNow(),(e=this.loader)==null||e.destroy(),this.wrapper.remove()})}async unload(){return this.serialize(()=>this.unloadNow())}async unloadNow(){var t,e,i;if(this.loaded)return this.deselect(),this.frame.style.visibility="hidden",this.frame.ariaHidden="true",this.frame.style.pointerEvents="none",this.frame.classList.add("blank"),this.frame.classList.remove("loaded"),(t=this.comms)==null||t.halt(),(e=this.loader)==null||e.destroy(),this.comms=void 0,(i=this.conditionBridge)==null||i.destroy(),this.frame.blur(),new Promise((o,r)=>{this.frame.addEventListener("load",()=>{try{this.showPromise=void 0,o()}catch{}},{once:!0}),this.frame.addEventListener("error",s=>{try{this.showPromise=void 0,r(s.error)}catch{}},{once:!0}),this.source="about:blank",this.frame.contentWindow.location.replace("about:blank"),this.frame.style.display="none",this.frame.style.width="0px",this.frame.style.height="0px"})}deselect(){var t,e;(e=(t=this.frame.contentWindow)==null?void 0:t.getSelection())==null||e.removeAllRanges()}async unfocus(){return this.serialize(()=>this.unfocusNow())}async unfocusNow(){var t;if(this.frame.parentElement)return this.comms===void 0||!this.comms.ready?void 0:(this.frame.blur(),new Promise((e,i)=>{var o;(o=this.comms)==null||o.send("unfocus",void 0,r=>{var s;(s=this.comms)==null||s.halt(),this.showPromise=void 0,e()})}));(t=this.comms)==null||t.halt()}applyContentProtection(){var t,e;this.comms||this.comms.resume(),this.comms.send("peripherals_protection",this.contentProtectionConfig),this.keyboardPeripheralsConfig&&this.keyboardPeripheralsConfig.length>0&&((t=this.conditionBridge)==null||t.destroy(),this.conditionBridge=new oe(this.keyboardPeripheralsConfig,i=>{i.length>0&&this.comms.send("keyboard_peripherals",i)}),this.conditionBridge.setup()),(e=this.contentProtectionConfig.protectPrinting)!=null&&e.disable&&this.comms.send("print_protection",this.contentProtectionConfig.protectPrinting),this.resizeWatchSelectors.forEach(i=>{this.comms.send("decoration_resize",{action:"watch",selector:i})}),this.pendingUnwatchSelectors.forEach(i=>{this.comms.send("decoration_resize",{action:"unwatch",selector:i})}),this.pendingUnwatchSelectors=[]}addResizeTarget(t){var e;this.resizeWatchSelectors.includes(t)||this.resizeWatchSelectors.push(t),this.pendingUnwatchSelectors=this.pendingUnwatchSelectors.filter(i=>i!==t),(e=this.comms)!=null&&e.ready&&this.comms.send("decoration_resize",{action:"watch",selector:t})}removeResizeTarget(t){var e;this.resizeWatchSelectors=this.resizeWatchSelectors.filter(i=>i!==t),(e=this.comms)!=null&&e.ready?this.comms.send("decoration_resize",{action:"unwatch",selector:t}):this.pendingUnwatchSelectors.includes(t)||this.pendingUnwatchSelectors.push(t)}async show(t){return this.serialize(()=>this.showNow(t))}async showNow(t){if(!this.frame.parentElement){console.warn("Trying to show frame that is not attached to the DOM");return}if(!this.loaded){this.showPromise=void 0;return}return this.showPromise?(this.cachedPage!==t&&(this.update(t),this.cachedPage=t),this.showPromise):(this.cachedPage=t,this.comms?this.comms.resume():this.comms=new we(this.frame.contentWindow,this.source),this.showPromise=new Promise((e,i)=>{this.comms.send("focus",void 0,o=>{this.update(this.cachedPage),this.applyContentProtection(),e()})}),this.showPromise)}async activate(){return this.serialize(()=>new Promise((t,e)=>{var i,o;if(!((i=this.comms)!=null&&i.ready))return t();(o=this.comms)==null||o.send("activate",void 0,()=>{t()})}))}get element(){return this.wrapper}get iframe(){return this.frame}get realSize(){return this.frame.getBoundingClientRect()}get loaded(){return this.frame.contentWindow&&this.frame.contentWindow.location.href!=="about:blank"}set width(t){if(Tt()){let e=this.wrapper.attributeStyleMap.get("width");if(e instanceof CSSUnitValue&&e.unit==="percent"&&e.value===t)return;this.wrapper.attributeStyleMap.set("width",CSS.percent(t))}else{let e=`${t}%`;if(this.wrapper.style.width===e)return;this.wrapper.style.width=e}}set height(t){if(Tt()){let e=this.wrapper.attributeStyleMap.get("height");if(e instanceof CSSUnitValue&&e.unit==="px"&&e.value===t)return;this.wrapper.attributeStyleMap.set("height",CSS.px(t))}else{let e=`${t}px`;if(this.wrapper.style.height===e)return;this.wrapper.style.height=e}}get window(){if(!this.frame.contentWindow)throw Error("Trying to use frame window when it doesn't exist");return this.frame.contentWindow}get atLeft(){return this.window.scrollX<5}get atRight(){return this.window.scrollX>this.window.document.scrollingElement.scrollWidth-this.window.innerWidth-5}get msg(){return this.comms}get ldr(){return this.loader}};p();var Oo=(n=>(n.auto="auto",n.landscape="landscape",n.portrait="portrait",n))(Oo||{}),Lo=(n=>(n.auto="auto",n.both="both",n.none="none",n.landscape="landscape",n))(Lo||{}),zo=class{constructor(t){this.shift=!0,this.spreads=[],this.nLandscape=0,this.index(t),this.testShift(t),console.log(`Indexed ${this.spreads.length} spreads for ${t.readingOrder.items.length} items`)}index(t,e=!1){this.nLandscape=0,t.readingOrder.items.forEach((i,o)=>{var s,a,l,h,c;e||(t.readingOrder.items[o]=i.addProperties({number:o+1,isImage:((s=i.type)==null?void 0:s.indexOf("image/"))===0}));let r=((a=i.properties)==null?void 0:a.otherProperties.orientation)==="landscape";(!((l=i.properties)!=null&&l.page)||e)&&(i.properties=(h=i.properties)==null?void 0:h.add({page:r?"center":((this.shift?0:1)+o-this.nLandscape)%2?t.metadata.readingProgression===D.rtl?"right":"left":t.metadata.readingProgression===D.rtl?"left":"right"})),(r||(c=i.properties)!=null&&c.otherProperties.addBlank)&&this.nLandscape++}),e&&(this.spreads=[]),this.buildSpreads(t.readingOrder)}testShift(t){let e=!1;this.spreads.forEach((i,o)=>{var a,l,h,c,d;if(i.length>1)return;let r=i[0],s=(a=r.properties)==null?void 0:a.otherProperties.orientation;o===0&&(s==="landscape"||s!=="portrait"&&((r.width||0)>(r.height||0)||((l=r.properties)==null?void 0:l.otherProperties.spread)==="both"))&&(this.shift=!1),e&&((h=r.properties)==null?void 0:h.page)===st.center&&this.spreads[o-1][0].addProperties({addBlank:!0}),s==="portrait"&&((c=r.properties)==null?void 0:c.page)!=="center"&&((d=r.properties)==null?void 0:d.otherProperties.number)>1?e=!0:e=!1}),this.shift||this.index(t,!0)}buildSpreads(t){let e=[];t.items.forEach((i,o)=>{var r;!o&&this.shift?this.spreads.push([i]):((r=i.properties)==null?void 0:r.page)===st.center?(e.length>0&&this.spreads.push(e),this.spreads.push([i]),e=[]):e.length>=2?(this.spreads.push(e),e=[i]):e.push(i)}),e.length>0&&this.spreads.push(e)}currentSpread(t,e){return this.spreads[Math.min(Math.floor(t/e),this.spreads.length-1)]}findByLink(t){return this.spreads.find(e=>e.includes(t))||void 0}};var qa=8,Ja=5,sd=300,ad=15e3,ld=250,Za=150,Qa=500,Ao=class{constructor(t,e,i,o,r,s,a,l=[],h){var d;if(this.pool=new Map,this.blobs=new Map,this.inprogress=new Map,this.delayedShow=new Map,this.delayedTimeout=new Map,this.previousFrames=[],this.injector=null,this.width=0,this.height=0,this.currentSlide=0,this.spread=!0,this.orientationInternal=-1,this.bookScale=null,this.bookTranslate=null,this.bookTransform=null,this.container=t,this.positions=e,this.pub=i,this.injector=r!=null?r:null,this.contentProtectionConfig=s||{},this.keyboardPeripheralsConfig=a||[],this.resizeWatchSelectors=[...l],this.upgradeInsecureRequests=h!=null?h:"always",this.spreadPresentation=((d=i.metadata.otherMetadata)==null?void 0:d.spread)||Lo.auto,this.pub.metadata.effectiveReadingProgression!==D.rtl&&this.pub.metadata.effectiveReadingProgression!==D.ltr)throw Error("Unsupported reading progression for fixed-layout EPUB");this.spreader=new zo(this.pub),this.containerHeightCached=t.clientHeight,this.bookElement=document.createElement("div"),this.bookElement.ariaLabel="Book",this.bookElement.tabIndex=-1,this.updateBookStyle(!0),this.spineElement=document.createElement("div"),this.spineElement.ariaLabel="Spine",this.bookElement.appendChild(this.spineElement),this.container.appendChild(this.bookElement),this.updateSpineStyle(!0),this.peripherals=new ko(this);let c=document.createDocumentFragment();this.pub.readingOrder.items.forEach(u=>{var g,b;let m=new To(this.peripherals,this.pub.metadata.effectiveReadingProgression,u.href,this.contentProtectionConfig,this.keyboardPeripheralsConfig,this.resizeWatchSelectors);this.pool.set(u.href,m),m.width=100/this.length*(((g=u.properties)==null?void 0:g.otherProperties.orientation)===Oo.landscape||(b=u.properties)!=null&&b.otherProperties.addBlank?this.perPage:1),m.height=this.height,c.appendChild(m.wrapper)}),this.spineElement.appendChild(c)}set listener(t){this._listener=t}get listener(){return this._listener}get doNotDisturb(){return this.peripherals.pan.touchID>0}resizeHandler(t=!0,e=!0){this.currentSlide+this.perPage>this.length&&(this.currentSlide=this.length<=this.perPage?0:this.length-1),this.containerHeightCached=this.container.clientHeight,this.orientationInternal=-1,this.updateSpineStyle(!0),t&&(this.currentSlide=this.reAlign(),this.slideToCurrent(!e,e)),clearTimeout(this.resizeTimeout),this.resizeTimeout=window.setTimeout(()=>{let i=100/this.length,o=new Map(this.pub.readingOrder.items.map(r=>[r.href,r]));this.pool.forEach((r,s)=>{let a=o.get(s);a&&requestAnimationFrame(()=>{var h,c;if(r.width=i*(((h=a.properties)==null?void 0:h.otherProperties.orientation)===Oo.landscape||(c=a.properties)!=null&&c.otherProperties.addBlank?this.perPage:1),r.height=this.height,!r.loaded)return;let l=this.spreader.findByLink(a);r.update(this.spreadPosition(l,a))})})},ld)}updateDimensions(){this.width=this.bookElement.clientWidth,this.height=this.bookElement.clientHeight}get rtl(){return this.pub.metadata.effectiveReadingProgression===D.rtl}get single(){return!this.spread||this.portrait}get perPage(){return this.spread&&!this.portrait?2:1}get threshold(){return 50}get portrait(){return this.spreadPresentation===Lo.none?!0:(this.orientationInternal===-1&&(this.orientationInternal=this.containerHeightCached>this.container.clientWidth?1:0),this.orientationInternal===1)}updateSpineStyle(t,e=!0){let i=0;if(this.updateDimensions(),this.perPage>1&&(i=this.width/2),Tt())this.spineElement.attributeStyleMap.set("transition",new CSSUnparsedValue([t?`all ${e?Za:Qa}ms ease-out`:"all 0ms ease-out"])),this.spineElement.attributeStyleMap.set("margin-right",CSS.px(this.rtl?i:0)),this.spineElement.attributeStyleMap.set("margin-left",CSS.px(this.rtl?0:i)),this.spineElement.attributeStyleMap.set("width",CSS.px(this.width/this.perPage*this.length)),this.transform?this.spineElement.attributeStyleMap.set("transform",new CSSTransformValue([new CSSTranslate(CSS.px(this.transform||0),CSS.px(0),CSS.px(0))])):this.spineElement.attributeStyleMap.delete("transform"),this.spineElement.attributeStyleMap.set("contain",new CSSUnparsedValue(["content"]));else{let o={transition:t?`all ${e?Za:Qa}ms ease-out`:"all 0ms ease-out",marginRight:this.rtl?`${i}px`:"0",marginLeft:this.rtl?"0":`${i}px`,width:`${this.width/this.perPage*this.length}px`,transform:this.transform?`translate3d(${this.transform}px, 0px, 0px)`:"",contain:"content"};Object.assign(this.spineElement.style,o)}}updateBookStyle(t=!1){var r,s,a,l;if(t){let h={overflow:"hidden",direction:this.pub.metadata.effectiveReadingProgression,cursor:"",height:"100%",width:"100%",position:"relative",outline:"none",transition:(r=this.peripherals)!=null&&r.dragState?"none":"transform .15s ease-in-out",touchAction:"none"};Object.assign(this.bookElement.style,h)}let e=((s=this.peripherals)==null?void 0:s.scale)||1,i=((a=this.peripherals)==null?void 0:a.pan.translateX)||0,o=((l=this.peripherals)==null?void 0:l.pan.translateY)||0;Tt()?(this.bookTransform||(this.bookScale=new CSSScale(1,1),this.bookTranslate=new CSSTranslate(CSS.px(0),CSS.px(0),CSS.px(0)),this.bookTransform=new CSSTransformValue([this.bookScale,this.bookTranslate])),this.bookScale.x.value=e,this.bookScale.y.value=e,this.bookTranslate.x.value=i,this.bookTranslate.y.value=o,this.bookElement.attributeStyleMap.set("transform",this.bookTransform)):this.bookElement.style.transform=`scale(${e}) translate3d(${i}px, ${o}px, 0px)`}goTo(t){if(this.slength<=this.perPage)return;t=this.reAlign(t);let e=this.currentSlide;this.currentSlide=Math.min(Math.max(t,0),this.length-1),e!==this.currentSlide&&this.slideToCurrent(!1)}onChange(){this.peripherals.scale=1,this.updateBookStyle()}get offset(){return(this.rtl?1:-1)*this.currentSlide*(this.width/this.perPage)}get length(){if(this.single)return this.slength;let t=this.slength+this.nLandscape;return this.shift&&t%2===0?t+1:t}get slength(){return this.pub.readingOrder.items.length||0}get shift(){return this.spreader.shift}get nLandscape(){return this.spreader.nLandscape}setPerPage(t){t===null?this.spread=!0:t===1?this.spread=!1:this.spread=!0,requestAnimationFrame(()=>this.resizeHandler(!0))}slideToCurrent(t,e=!0){this.updateDimensions(),t?requestAnimationFrame(()=>{requestAnimationFrame(()=>{this.transform=this.offset,this.updateSpineStyle(!0,e),this.deselect()})}):(this.transform=this.offset,this.updateSpineStyle(!1),this.deselect())}bounce(t=!1){requestAnimationFrame(()=>{this.transform=this.offset+50*(t?1:-1),this.updateSpineStyle(!0,!0),setTimeout(()=>{this.transform=this.offset,this.updateSpineStyle(!0,!0)},100)})}next(t=1){if(this.slength<=this.perPage)return!1;let e=this.currentSlide;return this.currentSlide=Math.min(this.currentSlide+t,this.length-1),this.perPage>1&&this.currentSlide%2&&this.currentSlide--,this.currentSlide===e&&(this.currentSlide+1,this.length),e!==this.currentSlide?(this.slideToCurrent(!0),this.onChange(),!0):(this.bounce(this.rtl),!1)}prev(t=1){if(this.slength<=this.perPage)return!1;let e=this.currentSlide;return this.currentSlide=Math.max(this.currentSlide-t,0),this.perPage>1&&this.currentSlide%2&&this.currentSlide++,e!==this.currentSlide?(this.slideToCurrent(!0),this.onChange(),!0):(this.bounce(!this.rtl),!1)}get ownerWindow(){return this.container.ownerDocument.defaultView||window}async destroy(){var s;let t=this.inprogress.values(),e=t.next(),i=[];for(;e.value;)i.push(e.value),e=t.next();i.length>0&&await Promise.allSettled(i),this.inprogress.clear();let o=this.pool.values(),r=o.next();for(;r.value;)await r.value.destroy(),r=o.next();this.pool.clear(),this.blobs.forEach(a=>a.reset()),this.blobs.clear(),(s=this.injector)==null||s.dispose(),this.container.childNodes.forEach(a=>{(a.nodeType===Node.ELEMENT_NODE||a.nodeType===Node.TEXT_NODE)&&a.remove()})}makeSpread(t){return this.perPage<2?[this.pub.readingOrder.items[t]]:this.spreader.currentSpread(t,this.perPage)}reAlign(t=this.currentSlide){return t%2&&!this.single&&t++,t}spreadPosition(t,e){return this.perPage<2?st.center:t.length<2?st.center:e.href===t[0].href?this.rtl?st.right:st.left:this.rtl?st.left:st.right}async waitForItem(t){if(this.inprogress.has(t)&&await this.inprogress.get(t),this.delayedShow.has(t)){let e=this.delayedTimeout.get(t);e>0?clearTimeout(e):await this.delayedShow.get(t),this.delayedTimeout.set(t,0),this.delayedShow.delete(t)}}async cancelShowing(t){if(this.delayedShow.has(t)){let e=this.delayedTimeout.get(t);e>0&&clearTimeout(e),this.delayedShow.delete(t)}}async update(t,e,i,o=!1){let r=this.pub.readingOrder.items.findIndex(l=>l.href===e.href);if(r<0)throw Error("Href not found in reading order");this.currentSlide!==r&&(this.currentSlide=this.reAlign(r),this.slideToCurrent(!0));let s=this.makeSpread(this.currentSlide);this.perPage>1&&r++;for(let l of s)await this.waitForItem(l.href);let a=new Promise(async(l,h)=>{var y;let c=[],d=[];this.positions.forEach((f,w)=>{(w>r+qa||w<r-qa)&&(c.includes(f.href)||c.push(f.href)),w<r+Ja&&w>r-Ja&&(d.includes(f.href)||d.push(f.href))}),c.forEach(async f=>{var w,R;d.includes(f)||this.pool.has(f)&&(this.cancelShowing(f),await((w=this.pool.get(f))==null?void 0:w.unload()),(R=this.blobs.get(f))==null||R.reset())}),this.currentBaseURL!==void 0&&t.baseURL!==this.currentBaseURL&&(this.blobs.forEach(f=>f.reset()),this.blobs.clear()),this.currentBaseURL=t.baseURL;let u=async f=>{let w=t.readingOrder.findIndexWithHref(f),R=t.readingOrder.items[w];if(R&&(this.blobs.has(f)||this.blobs.set(f,new Ye(t,this.currentBaseURL||"",R,{injector:this.injector,upgradeInsecureRequests:this.upgradeInsecureRequests})),!this.delayedShow.has(f))){let v=new Promise((C,z)=>{let k=!1,T=window.setTimeout(async()=>{this.delayedTimeout.set(f,0);try{let O=this.makeSpread(this.reAlign(w)),x=this.spreadPosition(O,R),P=this.pool.get(f);await P.load(i,await this.blobs.get(f).build(!0)),this.peripherals.isScaled||await P.show(x)}catch(O){console.warn(`Failed preloading ${f}`,O)}this.delayedShow.delete(f),k=!0,C()},sd);setTimeout(()=>{!k&&this.delayedShow.get(f)===v&&z(`Offscreen load timeout: ${f}`)},ad),this.delayedTimeout.set(f,T)});this.delayedShow.set(f,v)}};try{await Promise.all(d.map(f=>u(f)))}catch(f){h(f);return}let m=[],g=[],b=[];for(let f of s){let w=this.pool.get(f.href),R=this.blobs.get(f.href);if(R){this.cancelShowing(f.href);try{await w.load(i,await R.build(!0)),await w.show(this.spreadPosition(s,f)),this.previousFrames.push(w),await w.activate(),m.push(w)}catch(v){console.warn(`Failed showing ${f.href}`,v),g.push(v),b.push(f)}}}if(m.length>0){let f=m[0].loadPageSize();for(let w of b){let R=this.pool.get(w.href),v=this.blobs.get(w.href);if(v)try{await R.load(i,await v.buildBlankFrame(f.width,f.height)),await R.show(this.spreadPosition(s,w)),this.previousFrames.push(R),await R.activate(),m.push(R)}catch(C){console.warn(`Failed showing a blank page for ${w.href}`,C)}}}else if(g.length>0){h(g[0]);return}for(;this.previousFrames.length>0;){let f=this.previousFrames.shift();f&&!m.includes(f)&&await f.unfocus()}this.previousFrames=m;let S=this.container.ownerDocument.activeElement;S&&S.tagName==="IFRAME"&&!m.some(f=>f.iframe===S)&&((y=m[0])==null||y.iframe.focus({preventScroll:!0})),l()});for(let l of s)this.inprogress.set(l.href,a);try{await a}finally{for(let l of s)this.inprogress.delete(l.href)}}addResizeTarget(t){this.resizeWatchSelectors.includes(t)||this.resizeWatchSelectors.push(t),this.pool.forEach(e=>e.addResizeTarget(t))}removeResizeTarget(t){this.resizeWatchSelectors=this.resizeWatchSelectors.filter(e=>e!==t),this.pool.forEach(e=>e.removeResizeTarget(t))}get currentFrames(){if(this.perPage<2){let t=this.pub.readingOrder.items[this.currentSlide];return[this.pool.get(t.href)]}return this.spreader.currentSpread(this.currentSlide,this.perPage).map(t=>this.pool.get(t.href))}get currentBounds(){let t={x:0,y:0,width:0,height:0,top:0,right:0,bottom:0,left:0,toJSON(){return this}};return this.currentFrames.forEach(e=>{if(!e)return;let i=e.realSize;t.x=Math.min(t.x,i.x),t.y=Math.min(t.y,i.y),t.width+=i.width,t.height=Math.max(t.height,i.height),t.top=Math.min(t.top,i.top),t.right=Math.min(t.right,i.right),t.bottom=Math.min(t.bottom,i.bottom),t.left=Math.min(t.left,i.left)}),t}get viewport(){let t={readingOrder:[],progressions:new Map,positions:null};return(this.perPage<2?[this.pub.readingOrder.items[this.currentSlide]]:this.spreader.currentSpread(this.currentSlide,this.perPage)).forEach(e=>{t.readingOrder.push(e.href),t.progressions.set(e.href,{start:0,end:1})}),t.positions=this.getCurrentNumbers(),t}getCurrentNumbers(){var e,i,o,r;if(this.perPage<2)return[(e=this.pub.readingOrder.items[this.currentSlide].properties)==null?void 0:e.otherProperties.number];let t=this.spreader.currentSpread(this.currentSlide,this.perPage);return t.length>1?[(i=t[0].properties)==null?void 0:i.otherProperties.number,(o=t[t.length-1].properties)==null?void 0:o.otherProperties.number]:[(r=t[0].properties)==null?void 0:r.otherProperties.number]}deselect(){var t;(t=this.currentFrames)==null||t.forEach(e=>e==null?void 0:e.deselect())}};p();var Ut=class n{constructor(t={}){this.backgroundColor=pt(t.backgroundColor),this.blendFilter=K(t.blendFilter),this.constraint=H(t.constraint),this.columnCount=H(t.columnCount),this.darkenFilter=se(t.darkenFilter),this.deprecatedFontSize=K(t.deprecatedFontSize),this.fontFamily=pt(t.fontFamily),this.fontSize=ae(t.fontSize,Ce.range),this.fontSizeNormalize=K(t.fontSizeNormalize),this.fontOpticalSizing=K(t.fontOpticalSizing),this.fontWeight=ae(t.fontWeight,Ee.range),this.fontWidth=ae(t.fontWidth,xe.range),this.hyphens=K(t.hyphens),this.invertFilter=se(t.invertFilter),this.invertGaijiFilter=se(t.invertGaijiFilter),this.iOSPatch=K(t.iOSPatch),this.iPadOSPatch=K(t.iPadOSPatch),this.letterSpacing=H(t.letterSpacing),this.ligatures=K(t.ligatures),this.lineHeight=H(t.lineHeight),this.linkColor=pt(t.linkColor),this.noRuby=K(t.noRuby),this.pageGutter=H(t.pageGutter),this.paragraphIndent=H(t.paragraphIndent),this.paragraphSpacing=H(t.paragraphSpacing),this.scroll=K(t.scroll),this.scrollPaddingTop=H(t.scrollPaddingTop),this.scrollPaddingBottom=H(t.scrollPaddingBottom),this.scrollPaddingLeft=H(t.scrollPaddingLeft),this.scrollPaddingRight=H(t.scrollPaddingRight),this.selectionBackgroundColor=pt(t.selectionBackgroundColor),this.selectionTextColor=pt(t.selectionTextColor),this.textAlign=uo(t.textAlign,re),this.textColor=pt(t.textColor),this.textNormalization=K(t.textNormalization),this.visitedColor=pt(t.visitedColor),this.wordSpacing=H(t.wordSpacing),this.optimalLineLength=H(t.optimalLineLength),this.maximalLineLength=H(t.maximalLineLength),this.minimalLineLength=H(t.minimalLineLength)}static serialize(t){let{...e}=t;return JSON.stringify(e)}static deserialize(t){try{let e=JSON.parse(t);return new n(e)}catch(e){return console.error("Failed to deserialize preferences:",e),null}}merging(t){var i,o,r,s;let e={...this};for(let a of Object.keys(t))t[a]!==void 0&&(a!=="maximalLineLength"||t[a]===null||t[a]>=((o=(i=t.optimalLineLength)!=null?i:e.optimalLineLength)!=null?o:65))&&(a!=="minimalLineLength"||t[a]===null||t[a]<=((s=(r=t.optimalLineLength)!=null?r:e.optimalLineLength)!=null?s:65))&&(e[a]=t[a]);return new n(e)}};p();var Mo=class{constructor(t){var e,i,o,r,s,a,l,h,c,d,u,m,g,b,S,y,f;this.backgroundColor=pt(t.backgroundColor)||null,this.blendFilter=(e=K(t.blendFilter))!=null?e:!1,this.constraint=H(t.constraint)||0,this.columnCount=H(t.columnCount)||null,this.darkenFilter=(i=se(t.darkenFilter))!=null?i:!1,this.deprecatedFontSize=K(t.deprecatedFontSize),(this.deprecatedFontSize===!1||this.deprecatedFontSize===null)&&(this.deprecatedFontSize=!CSS.supports("zoom","1")),this.fontFamily=pt(t.fontFamily)||null,this.fontSize=ae(t.fontSize,Ce.range)||1,this.fontSizeNormalize=(o=K(t.fontSizeNormalize))!=null?o:!1,this.fontOpticalSizing=(r=K(t.fontOpticalSizing))!=null?r:null,this.fontWeight=ae(t.fontWeight,Ee.range)||null,this.fontWidth=ae(t.fontWidth,xe.range)||null,this.hyphens=(s=K(t.hyphens))!=null?s:null,this.invertFilter=(a=se(t.invertFilter))!=null?a:!1,this.invertGaijiFilter=(l=se(t.invertGaijiFilter))!=null?l:!1,this.iOSPatch=t.iOSPatch===!1?!1:(Rt.OS.iOS||Rt.OS.iPadOS)&&Rt.iOSRequest==="mobile",this.iPadOSPatch=t.iPadOSPatch===!1?!1:Rt.OS.iPadOS&&Rt.iOSRequest==="desktop",this.letterSpacing=H(t.letterSpacing)||null,this.ligatures=(h=K(t.ligatures))!=null?h:null,this.lineHeight=H(t.lineHeight)||null,this.linkColor=pt(t.linkColor)||null,this.noRuby=(c=K(t.noRuby))!=null?c:!1,this.pageGutter=mo(H(t.pageGutter),20),this.paragraphIndent=(d=H(t.paragraphIndent))!=null?d:null,this.paragraphSpacing=(u=H(t.paragraphSpacing))!=null?u:null,this.scroll=(m=K(t.scroll))!=null?m:!1,this.scrollPaddingTop=(g=H(t.scrollPaddingTop))!=null?g:null,this.scrollPaddingBottom=(b=H(t.scrollPaddingBottom))!=null?b:null,this.scrollPaddingLeft=(S=H(t.scrollPaddingLeft))!=null?S:null,this.scrollPaddingRight=(y=H(t.scrollPaddingRight))!=null?y:null,this.selectionBackgroundColor=pt(t.selectionBackgroundColor)||null,this.selectionTextColor=pt(t.selectionTextColor)||null,this.textAlign=uo(t.textAlign,re)||null,this.textColor=pt(t.textColor)||null,this.textNormalization=(f=K(t.textNormalization))!=null?f:!1,this.visitedColor=pt(t.visitedColor)||null,this.wordSpacing=H(t.wordSpacing)||null,this.optimalLineLength=H(t.optimalLineLength)||65,this.maximalLineLength=mo(Aa(t.maximalLineLength,this.optimalLineLength),80),this.minimalLineLength=mo(La(t.minimalLineLength,this.optimalLineLength),40),this.experiments=Ma(t.experiments)||null}};p();p();var hd="#FFFFFF",cd="#121212",dd="#0000EE",ud="#551A8B",md="#b4d8fe",pd="inherit",Fe={backgroundColor:hd,textColor:cd,linkColor:dd,visitedColor:ud,selectionBackgroundColor:md,selectionTextColor:pd};var Ci=class{constructor(t,e,i){var o;this.preferences=new Ut({...t}),this.settings=e,this.metadata=i,this.layout=((o=this.metadata)==null?void 0:o.effectiveLayout)||F.reflowable}clear(){this.preferences=new Ut({backgroundColor:null,blendFilter:null,columnCount:null,constraint:null,darkenFilter:null,deprecatedFontSize:null,fontFamily:null,fontSize:null,fontSizeNormalize:null,fontOpticalSizing:null,fontWeight:null,fontWidth:null,hyphens:null,invertFilter:null,invertGaijiFilter:null,iOSPatch:null,iPadOSPatch:null,letterSpacing:null,ligatures:null,lineHeight:null,linkColor:null,maximalLineLength:null,minimalLineLength:null,noRuby:null,optimalLineLength:null,pageGutter:null,paragraphIndent:null,paragraphSpacing:null,scroll:null,scrollPaddingTop:null,scrollPaddingBottom:null,scrollPaddingLeft:null,scrollPaddingRight:null,selectionBackgroundColor:null,selectionTextColor:null,textAlign:null,textColor:null,textNormalization:null,visitedColor:null,wordSpacing:null})}updatePreference(t,e){this.preferences[t]=e}get backgroundColor(){return new Z({initialValue:this.preferences.backgroundColor,effectiveValue:this.settings.backgroundColor||Fe.backgroundColor,isEffective:this.preferences.backgroundColor!==null,onChange:t=>{this.updatePreference("backgroundColor",t!=null?t:null)}})}get blendFilter(){return new _t({initialValue:this.preferences.blendFilter,effectiveValue:this.settings.blendFilter||!1,isEffective:this.preferences.blendFilter!==null,onChange:t=>{this.updatePreference("blendFilter",t!=null?t:null)}})}get columnCount(){return new Z({initialValue:this.preferences.columnCount,effectiveValue:this.settings.columnCount||null,isEffective:this.layout!==F.fixed&&!this.settings.scroll,onChange:t=>{this.updatePreference("columnCount",t!=null?t:null)}})}get constraint(){return new Z({initialValue:this.preferences.constraint,effectiveValue:this.preferences.constraint||0,isEffective:!0,onChange:t=>{this.updatePreference("constraint",t!=null?t:null)}})}get darkenFilter(){return new ht({initialValue:typeof this.preferences.darkenFilter=="boolean"?100:this.preferences.darkenFilter,effectiveValue:typeof this.settings.darkenFilter=="boolean"?100:this.settings.darkenFilter||0,isEffective:this.settings.darkenFilter!==null,onChange:t=>{this.updatePreference("darkenFilter",t!=null?t:null)},supportedRange:Re.range,step:Re.step})}get deprecatedFontSize(){return new _t({initialValue:this.preferences.deprecatedFontSize,effectiveValue:CSS.supports("zoom","1")?this.settings.deprecatedFontSize||!1:!0,isEffective:this.layout!==F.fixed,onChange:t=>{this.updatePreference("deprecatedFontSize",t!=null?t:null)}})}get fontFamily(){return new Z({initialValue:this.preferences.fontFamily,effectiveValue:this.settings.fontFamily||null,isEffective:this.layout!==F.fixed,onChange:t=>{this.updatePreference("fontFamily",t!=null?t:null)}})}get fontSize(){return new ht({initialValue:this.preferences.fontSize,effectiveValue:this.settings.fontSize||1,isEffective:this.layout!==F.fixed,onChange:t=>{this.updatePreference("fontSize",t!=null?t:null)},supportedRange:Ce.range,step:Ce.step})}get fontSizeNormalize(){return new _t({initialValue:this.preferences.fontSizeNormalize,effectiveValue:this.settings.fontSizeNormalize||!1,isEffective:this.layout!==F.fixed&&this.preferences.fontSizeNormalize!==null,onChange:t=>{this.updatePreference("fontSizeNormalize",t!=null?t:null)}})}get fontOpticalSizing(){return new _t({initialValue:this.preferences.fontOpticalSizing,effectiveValue:this.settings.fontOpticalSizing||!0,isEffective:this.layout!==F.fixed&&this.preferences.fontOpticalSizing!==null,onChange:t=>{this.updatePreference("fontOpticalSizing",t!=null?t:null)}})}get fontWeight(){return new ht({initialValue:this.preferences.fontWeight,effectiveValue:this.settings.fontWeight||400,isEffective:this.layout!==F.fixed&&this.preferences.fontWeight!==null,onChange:t=>{this.updatePreference("fontWeight",t!=null?t:null)},supportedRange:Ee.range,step:Ee.step})}get fontWidth(){return new ht({initialValue:this.preferences.fontWidth,effectiveValue:this.settings.fontWidth||100,isEffective:this.layout!==F.fixed&&this.preferences.fontWidth!==null,onChange:t=>{this.updatePreference("fontWidth",t!=null?t:null)},supportedRange:xe.range,step:xe.step})}get hyphens(){var t;return new _t({initialValue:this.preferences.hyphens,effectiveValue:this.settings.hyphens||!1,isEffective:this.layout!==F.fixed&&((t=this.metadata)==null?void 0:t.effectiveReadingProgression)===D.ltr&&this.preferences.hyphens!==null,onChange:e=>{this.updatePreference("hyphens",e!=null?e:null)}})}get invertFilter(){return new ht({initialValue:typeof this.preferences.invertFilter=="boolean"?100:this.preferences.invertFilter,effectiveValue:typeof this.settings.invertFilter=="boolean"?100:this.settings.invertFilter||0,isEffective:this.settings.invertFilter!==null,onChange:t=>{this.updatePreference("invertFilter",t!=null?t:null)},supportedRange:Re.range,step:Re.step})}get invertGaijiFilter(){return new ht({initialValue:typeof this.preferences.invertGaijiFilter=="boolean"?100:this.preferences.invertGaijiFilter,effectiveValue:typeof this.settings.invertGaijiFilter=="boolean"?100:this.settings.invertGaijiFilter||0,isEffective:this.preferences.invertGaijiFilter!==null,onChange:t=>{this.updatePreference("invertGaijiFilter",t!=null?t:null)},supportedRange:Re.range,step:Re.step})}get iOSPatch(){return new _t({initialValue:this.preferences.iOSPatch,effectiveValue:this.settings.iOSPatch||!1,isEffective:this.layout!==F.fixed,onChange:t=>{this.updatePreference("iOSPatch",t!=null?t:null)}})}get iPadOSPatch(){return new _t({initialValue:this.preferences.iPadOSPatch,effectiveValue:this.settings.iPadOSPatch||!1,isEffective:this.layout!==F.fixed,onChange:t=>{this.updatePreference("iPadOSPatch",t!=null?t:null)}})}get letterSpacing(){return new ht({initialValue:this.preferences.letterSpacing,effectiveValue:this.settings.letterSpacing||0,isEffective:this.layout!==F.fixed&&this.preferences.letterSpacing!==null,onChange:t=>{this.updatePreference("letterSpacing",t!=null?t:null)},supportedRange:Zn.range,step:Zn.step})}get ligatures(){return new _t({initialValue:this.preferences.ligatures,effectiveValue:this.settings.ligatures||!0,isEffective:(()=>{var e,i,o;if(this.preferences.ligatures===null||this.layout===F.fixed)return!1;let t=(o=(i=(e=this.metadata)==null?void 0:e.languages)==null?void 0:i[0])==null?void 0:o.toLowerCase();return!(t&&["zh","ja","ko","mn-mong"].some(r=>t.startsWith(r)))})(),onChange:t=>{this.updatePreference("ligatures",t!=null?t:null)}})}get lineHeight(){return new ht({initialValue:this.preferences.lineHeight,effectiveValue:this.settings.lineHeight,isEffective:this.layout!==F.fixed&&this.preferences.lineHeight!==null,onChange:t=>{this.updatePreference("lineHeight",t!=null?t:null)},supportedRange:Qn.range,step:Qn.step})}get linkColor(){return new Z({initialValue:this.preferences.linkColor,effectiveValue:this.settings.linkColor||Fe.linkColor,isEffective:this.layout!==F.fixed&&this.preferences.linkColor!==null,onChange:t=>{this.updatePreference("linkColor",t!=null?t:null)}})}get maximalLineLength(){return new ht({initialValue:this.preferences.maximalLineLength,effectiveValue:this.settings.maximalLineLength,isEffective:this.layout!==F.fixed,onChange:t=>{this.updatePreference("maximalLineLength",t)},supportedRange:Pe.range,step:Pe.step})}get minimalLineLength(){return new ht({initialValue:this.preferences.minimalLineLength,effectiveValue:this.settings.minimalLineLength,isEffective:this.layout!==F.fixed,onChange:t=>{this.updatePreference("minimalLineLength",t)},supportedRange:Pe.range,step:Pe.step})}get noRuby(){var t,e;return new _t({initialValue:this.preferences.noRuby,effectiveValue:this.settings.noRuby||!1,isEffective:this.layout!==F.fixed&&((e=(t=this.metadata)==null?void 0:t.languages)==null?void 0:e.includes("ja"))||!1,onChange:i=>{this.updatePreference("noRuby",i!=null?i:null)}})}get optimalLineLength(){return new ht({initialValue:this.preferences.optimalLineLength,effectiveValue:this.settings.optimalLineLength,isEffective:this.layout!==F.fixed,onChange:t=>{this.updatePreference("optimalLineLength",t)},supportedRange:Pe.range,step:Pe.step})}get pageGutter(){return new Z({initialValue:this.preferences.pageGutter,effectiveValue:this.settings.pageGutter,isEffective:this.layout!==F.fixed&&!this.settings.scroll,onChange:t=>{this.updatePreference("pageGutter",t!=null?t:null)}})}get paragraphIndent(){return new ht({initialValue:this.preferences.paragraphIndent,effectiveValue:this.settings.paragraphIndent||0,isEffective:this.layout!==F.fixed&&this.preferences.paragraphIndent!==null,onChange:t=>{this.updatePreference("paragraphIndent",t!=null?t:null)},supportedRange:tr.range,step:tr.step})}get paragraphSpacing(){return new ht({initialValue:this.preferences.paragraphSpacing,effectiveValue:this.settings.paragraphSpacing||0,isEffective:this.layout!==F.fixed&&this.preferences.paragraphSpacing!==null,onChange:t=>{this.updatePreference("paragraphSpacing",t!=null?t:null)},supportedRange:er.range,step:er.step})}get scroll(){return new _t({initialValue:this.preferences.scroll,effectiveValue:this.settings.scroll||!1,isEffective:this.layout!==F.fixed,onChange:t=>{this.updatePreference("scroll",t!=null?t:null)}})}get scrollPaddingTop(){return new Z({initialValue:this.preferences.scrollPaddingTop,effectiveValue:this.settings.scrollPaddingTop||0,isEffective:this.layout!==F.fixed&&!!this.settings.scroll&&this.preferences.scrollPaddingTop!==null,onChange:t=>{this.updatePreference("scrollPaddingTop",t!=null?t:null)}})}get scrollPaddingBottom(){return new Z({initialValue:this.preferences.scrollPaddingBottom,effectiveValue:this.settings.scrollPaddingBottom||0,isEffective:this.layout!==F.fixed&&!!this.settings.scroll&&this.preferences.scrollPaddingBottom!==null,onChange:t=>{this.updatePreference("scrollPaddingBottom",t!=null?t:null)}})}get scrollPaddingLeft(){return new Z({initialValue:this.preferences.scrollPaddingLeft,effectiveValue:this.settings.scrollPaddingLeft||0,isEffective:this.layout!==F.fixed&&!!this.settings.scroll&&this.preferences.scrollPaddingLeft!==null,onChange:t=>{this.updatePreference("scrollPaddingLeft",t!=null?t:null)}})}get scrollPaddingRight(){return new Z({initialValue:this.preferences.scrollPaddingRight,effectiveValue:this.settings.scrollPaddingRight||0,isEffective:this.layout!==F.fixed&&!!this.settings.scroll&&this.preferences.scrollPaddingRight!==null,onChange:t=>{this.updatePreference("scrollPaddingRight",t!=null?t:null)}})}get selectionBackgroundColor(){return new Z({initialValue:this.preferences.selectionBackgroundColor,effectiveValue:this.settings.selectionBackgroundColor||Fe.selectionBackgroundColor,isEffective:this.layout!==F.fixed&&this.preferences.selectionBackgroundColor!==null,onChange:t=>{this.updatePreference("selectionBackgroundColor",t!=null?t:null)}})}get selectionTextColor(){return new Z({initialValue:this.preferences.selectionTextColor,effectiveValue:this.settings.selectionTextColor||Fe.selectionTextColor,isEffective:this.layout!==F.fixed&&this.preferences.selectionTextColor!==null,onChange:t=>{this.updatePreference("selectionTextColor",t!=null?t:null)}})}get textAlign(){return new po({initialValue:this.preferences.textAlign,effectiveValue:this.settings.textAlign||re.start,isEffective:this.layout!==F.fixed&&this.preferences.textAlign!==null,onChange:t=>{this.updatePreference("textAlign",t!=null?t:null)},supportedValues:Object.values(re)})}get textColor(){return new Z({initialValue:this.preferences.textColor,effectiveValue:this.settings.textColor||Fe.textColor,isEffective:this.layout!==F.fixed&&this.preferences.textColor!==null,onChange:t=>{this.updatePreference("textColor",t!=null?t:null)}})}get textNormalization(){return new _t({initialValue:this.preferences.textNormalization,effectiveValue:this.settings.textNormalization||!1,isEffective:this.layout!==F.fixed,onChange:t=>{this.updatePreference("textNormalization",t!=null?t:null)}})}get visitedColor(){return new Z({initialValue:this.preferences.visitedColor,effectiveValue:this.settings.visitedColor||Fe.visitedColor,isEffective:this.layout!==F.fixed&&this.preferences.visitedColor!==null,onChange:t=>{this.updatePreference("visitedColor",t!=null?t:null)}})}get wordSpacing(){return new ht({initialValue:this.preferences.wordSpacing,effectiveValue:this.settings.wordSpacing||0,isEffective:this.layout!==F.fixed&&this.preferences.wordSpacing!==null,onChange:t=>{this.updatePreference("wordSpacing",t!=null?t:null)},supportedRange:ir.range,step:ir.step})}};p();p();function ke(n){let t=getComputedStyle(n),e=parseFloat(t.paddingLeft||"0"),i=parseFloat(t.paddingRight||"0");return n.clientWidth-e-i}function tl(n){let t=getComputedStyle(n),e=parseFloat(t.paddingTop||"0"),i=parseFloat(t.paddingBottom||"0");return n.clientHeight-e-i}p();var qe=class extends wi{constructor(t){var e,i,o,r,s,a,l,h,c,d,u,m,g,b,S,y,f,w,R,v,C,z,k,T,O,x,P,A,U,M,N,V;super(),this.a11yNormalize=(e=t.a11yNormalize)!=null?e:null,this.backgroundColor=(i=t.backgroundColor)!=null?i:null,this.blendFilter=(o=t.blendFilter)!=null?o:null,this.bodyHyphens=(r=t.bodyHyphens)!=null?r:null,this.colCount=(s=t.colCount)!=null?s:null,this.darkenFilter=(a=t.darkenFilter)!=null?a:null,this.deprecatedFontSize=(l=t.deprecatedFontSize)!=null?l:null,this.fontFamily=(h=t.fontFamily)!=null?h:null,this.fontOpticalSizing=(c=t.fontOpticalSizing)!=null?c:null,this.fontSize=(d=t.fontSize)!=null?d:null,this.fontSizeNormalize=(u=t.fontSizeNormalize)!=null?u:null,this.fontWeight=(m=t.fontWeight)!=null?m:null,this.fontWidth=(g=t.fontWidth)!=null?g:null,this.invertFilter=(b=t.invertFilter)!=null?b:null,this.invertGaijiFilter=(S=t.invertGaijiFilter)!=null?S:null,this.iOSPatch=(y=t.iOSPatch)!=null?y:null,this.iPadOSPatch=(f=t.iPadOSPatch)!=null?f:null,this.letterSpacing=(w=t.letterSpacing)!=null?w:null,this.ligatures=(R=t.ligatures)!=null?R:null,this.lineHeight=(v=t.lineHeight)!=null?v:null,this.lineLength=(C=t.lineLength)!=null?C:null,this.linkColor=(z=t.linkColor)!=null?z:null,this.noRuby=(k=t.noRuby)!=null?k:null,this.paraIndent=(T=t.paraIndent)!=null?T:null,this.paraSpacing=(O=t.paraSpacing)!=null?O:null,this.selectionBackgroundColor=(x=t.selectionBackgroundColor)!=null?x:null,this.selectionTextColor=(P=t.selectionTextColor)!=null?P:null,this.textAlign=(A=t.textAlign)!=null?A:null,this.textColor=(U=t.textColor)!=null?U:null,this.view=(M=t.view)!=null?M:null,this.visitedColor=(N=t.visitedColor)!=null?N:null,this.wordSpacing=(V=t.wordSpacing)!=null?V:null}toCSSProperties(){let t={};return this.a11yNormalize&&(t["--USER__a11yNormalize"]=this.toFlag("a11y")),this.backgroundColor&&(t["--USER__backgroundColor"]=this.backgroundColor),this.blendFilter&&(t["--USER__blendFilter"]=this.toFlag("blend")),this.bodyHyphens&&(t["--USER__bodyHyphens"]=this.bodyHyphens),this.colCount&&(t["--USER__colCount"]=this.toUnitless(this.colCount)),this.darkenFilter===!0?t["--USER__darkenFilter"]=this.toFlag("darken"):typeof this.darkenFilter=="number"&&(t["--USER__darkenFilter"]=this.toPercentage(this.darkenFilter)),this.deprecatedFontSize&&(t["--USER__fontSizeImplementation"]=this.toFlag("deprecatedFontSize")),this.fontFamily&&(t["--USER__fontFamily"]=this.fontFamily),this.fontOpticalSizing!=null&&(t["--USER__fontOpticalSizing"]=this.fontOpticalSizing),this.fontSize!=null&&(t["--USER__fontSize"]=this.toPercentage(this.fontSize,!0)),this.fontSizeNormalize&&(t["--USER__fontSizeNormalize"]=this.toFlag("normalize")),this.fontWeight!=null&&(t["--USER__fontWeight"]=this.toUnitless(this.fontWeight)),this.fontWidth!=null&&(t["--USER__fontWidth"]=typeof this.fontWidth=="string"?this.fontWidth:this.toUnitless(this.fontWidth)),this.invertFilter===!0?t["--USER__invertFilter"]=this.toFlag("invert"):typeof this.invertFilter=="number"&&(t["--USER__invertFilter"]=this.toPercentage(this.invertFilter)),this.invertGaijiFilter===!0?t["--USER__invertGaiji"]=this.toFlag("invertGaiji"):typeof this.invertGaijiFilter=="number"&&(t["--USER__invertGaiji"]=this.toPercentage(this.invertGaijiFilter)),this.iOSPatch&&(t["--USER__iOSPatch"]=this.toFlag("iOSPatch")),this.iPadOSPatch&&(t["--USER__iPadOSPatch"]=this.toFlag("iPadOSPatch")),this.letterSpacing!=null&&(t["--USER__letterSpacing"]=this.toRem(this.letterSpacing)),this.ligatures&&(t["--USER__ligatures"]=this.ligatures),this.lineHeight!=null&&(t["--USER__lineHeight"]=this.toUnitless(this.lineHeight)),this.lineLength!=null&&(t["--USER__lineLength"]=this.toPx(this.lineLength)),this.linkColor&&(t["--USER__linkColor"]=this.linkColor),this.noRuby&&(t["--USER__noRuby"]=this.toFlag("noRuby")),this.paraIndent!=null&&(t["--USER__paraIndent"]=this.toRem(this.paraIndent)),this.paraSpacing!=null&&(t["--USER__paraSpacing"]=this.toRem(this.paraSpacing)),this.selectionBackgroundColor&&(t["--USER__selectionBackgroundColor"]=this.selectionBackgroundColor),this.selectionTextColor&&(t["--USER__selectionTextColor"]=this.selectionTextColor),this.textAlign&&(t["--USER__textAlign"]=this.textAlign),this.textColor&&(t["--USER__textColor"]=this.textColor),this.view&&(t["--USER__view"]=this.toFlag(this.view)),this.visitedColor&&(t["--USER__visitedColor"]=this.visitedColor),this.wordSpacing!=null&&(t["--USER__wordSpacing"]=this.toRem(this.wordSpacing)),t}},No=class extends wi{constructor(t){var e,i,o,r,s,a,l,h,c,d,u,m,g,b,S,y,f,w,R,v,C,z,k,T,O,x,P,A,U,M,N,V,J,Q,le,Li,Te,Wt,ii,qt,ze,Oe;super(),this.backgroundColor=(e=t.backgroundColor)!=null?e:null,this.baseFontFamily=(i=t.baseFontFamily)!=null?i:null,this.baseFontSize=(o=t.baseFontSize)!=null?o:null,this.baseLineHeight=(r=t.baseLineHeight)!=null?r:null,this.boxSizingMedia=(s=t.boxSizingMedia)!=null?s:null,this.boxSizingTable=(a=t.boxSizingTable)!=null?a:null,this.colWidth=(l=t.colWidth)!=null?l:null,this.colCount=(h=t.colCount)!=null?h:null,this.colGap=(c=t.colGap)!=null?c:null,this.codeFontFamily=(d=t.codeFontFamily)!=null?d:null,this.compFontFamily=(u=t.compFontFamily)!=null?u:null,this.defaultLineLength=(m=t.defaultLineLength)!=null?m:null,this.flowSpacing=(g=t.flowSpacing)!=null?g:null,this.humanistTf=(b=t.humanistTf)!=null?b:null,this.linkColor=(S=t.linkColor)!=null?S:null,this.maxMediaWidth=(y=t.maxMediaWidth)!=null?y:null,this.maxMediaHeight=(f=t.maxMediaHeight)!=null?f:null,this.modernTf=(w=t.modernTf)!=null?w:null,this.monospaceTf=(R=t.monospaceTf)!=null?R:null,this.noOverflow=(v=t.noOverflow)!=null?v:null,this.noVerticalPagination=(C=t.noVerticalPagination)!=null?C:null,this.oldStyleTf=(z=t.oldStyleTf)!=null?z:null,this.pageGutter=(k=t.pageGutter)!=null?k:null,this.paraIndent=(T=t.paraIndent)!=null?T:null,this.paraSpacing=(O=t.paraSpacing)!=null?O:null,this.primaryColor=(x=t.primaryColor)!=null?x:null,this.scrollPaddingBottom=(P=t.scrollPaddingBottom)!=null?P:null,this.scrollPaddingLeft=(A=t.scrollPaddingLeft)!=null?A:null,this.scrollPaddingRight=(U=t.scrollPaddingRight)!=null?U:null,this.scrollPaddingTop=(M=t.scrollPaddingTop)!=null?M:null,this.sansSerifJa=(N=t.sansSerifJa)!=null?N:null,this.sansSerifJaV=(V=t.sansSerifJaV)!=null?V:null,this.sansTf=(J=t.sansTf)!=null?J:null,this.secondaryColor=(Q=t.secondaryColor)!=null?Q:null,this.selectionBackgroundColor=(le=t.selectionBackgroundColor)!=null?le:null,this.selectionTextColor=(Li=t.selectionTextColor)!=null?Li:null,this.serifJa=(Te=t.serifJa)!=null?Te:null,this.serifJaV=(Wt=t.serifJaV)!=null?Wt:null,this.textColor=(ii=t.textColor)!=null?ii:null,this.typeScale=(qt=t.typeScale)!=null?qt:null,this.visitedColor=(ze=t.visitedColor)!=null?ze:null,this.experiments=(Oe=t.experiments)!=null?Oe:null}toCSSProperties(){let t={};return this.backgroundColor&&(t["--RS__backgroundColor"]=this.backgroundColor),this.baseFontFamily&&(t["--RS__baseFontFamily"]=this.baseFontFamily),this.baseFontSize!=null&&(t["--RS__baseFontSize"]=this.toRem(this.baseFontSize)),this.baseLineHeight!=null&&(t["--RS__baseLineHeight"]=this.toUnitless(this.baseLineHeight)),this.boxSizingMedia&&(t["--RS__boxSizingMedia"]=this.boxSizingMedia),this.boxSizingTable&&(t["--RS__boxSizingTable"]=this.boxSizingTable),this.colWidth!=null&&(t["--RS__colWidth"]=this.colWidth),this.colCount!=null&&(t["--RS__colCount"]=this.toUnitless(this.colCount)),this.colGap!=null&&(t["--RS__colGap"]=this.toPx(this.colGap)),this.codeFontFamily&&(t["--RS__codeFontFamily"]=this.codeFontFamily),this.compFontFamily&&(t["--RS__compFontFamily"]=this.compFontFamily),this.defaultLineLength!=null&&(t["--RS__defaultLineLength"]=this.toPx(this.defaultLineLength)),this.flowSpacing!=null&&(t["--RS__flowSpacing"]=this.toRem(this.flowSpacing)),this.humanistTf&&(t["--RS__humanistTf"]=this.humanistTf),this.linkColor&&(t["--RS__linkColor"]=this.linkColor),this.maxMediaWidth&&(t["--RS__maxMediaWidth"]=this.toVw(this.maxMediaWidth)),this.maxMediaHeight&&(t["--RS__maxMediaHeight"]=this.toVh(this.maxMediaHeight)),this.modernTf&&(t["--RS__modernTf"]=this.modernTf),this.monospaceTf&&(t["--RS__monospaceTf"]=this.monospaceTf),this.noOverflow&&(t["--RS__disableOverflow"]=this.toFlag("noOverflow")),this.noVerticalPagination&&(t["--RS__disablePagination"]=this.toFlag("noVerticalPagination")),this.oldStyleTf&&(t["--RS__oldStyleTf"]=this.oldStyleTf),this.pageGutter!=null&&(t["--RS__pageGutter"]=this.toPx(this.pageGutter)),this.paraIndent!=null&&(t["--RS__paraIndent"]=this.toRem(this.paraIndent)),this.paraSpacing!=null&&(t["--RS__paraSpacing"]=this.toRem(this.paraSpacing)),this.primaryColor&&(t["--RS__primaryColor"]=this.primaryColor),this.sansSerifJa&&(t["--RS__sans-serif-ja"]=this.sansSerifJa),this.sansSerifJaV&&(t["--RS__sans-serif-ja-v"]=this.sansSerifJaV),this.sansTf&&(t["--RS__sansTf"]=this.sansTf),this.scrollPaddingBottom!=null&&(t["--RS__scrollPaddingBottom"]=this.toPx(this.scrollPaddingBottom)),this.scrollPaddingLeft!=null&&(t["--RS__scrollPaddingLeft"]=this.toPx(this.scrollPaddingLeft)),this.scrollPaddingRight!=null&&(t["--RS__scrollPaddingRight"]=this.toPx(this.scrollPaddingRight)),this.scrollPaddingTop!=null&&(t["--RS__scrollPaddingTop"]=this.toPx(this.scrollPaddingTop)),this.secondaryColor&&(t["--RS__secondaryColor"]=this.secondaryColor),this.selectionBackgroundColor&&(t["--RS__selectionBackgroundColor"]=this.selectionBackgroundColor),this.selectionTextColor&&(t["--RS__selectionTextColor"]=this.selectionTextColor),this.serifJa&&(t["--RS__serif-ja"]=this.serifJa),this.serifJaV&&(t["--RS__serif-ja-v"]=this.serifJaV),this.textColor&&(t["--RS__textColor"]=this.textColor),this.typeScale&&(t["--RS__typeScale"]=this.toUnitless(this.typeScale)),this.visitedColor&&(t["--RS__visitedColor"]=this.visitedColor),this.experiments&&this.experiments.forEach(e=>{t["--RS__"+e]=co[e].value}),t}};var Do=class{constructor(t){var e;this.rsProperties=t.rsProperties,this.userProperties=t.userProperties,this.lineLengths=t.lineLengths,this.container=t.container,this.containerParent=t.container.parentElement||document.documentElement,this.constraint=t.constraint,this.isCJKVertical=(e=t.isCJKVertical)!=null?e:!1,this.cachedColCount=t.userProperties.colCount,this.effectiveContainerWidth=ke(this.containerParent)}update(t){this.cachedColCount=t.columnCount,t.constraint!==this.constraint&&(this.constraint=t.constraint),t.pageGutter!==this.rsProperties.pageGutter&&(this.rsProperties.pageGutter=t.pageGutter),t.scrollPaddingBottom!==this.rsProperties.scrollPaddingBottom&&(this.rsProperties.scrollPaddingBottom=t.scrollPaddingBottom),t.scrollPaddingLeft!==this.rsProperties.scrollPaddingLeft&&(this.rsProperties.scrollPaddingLeft=t.scrollPaddingLeft),t.scrollPaddingRight!==this.rsProperties.scrollPaddingRight&&(this.rsProperties.scrollPaddingRight=t.scrollPaddingRight),t.scrollPaddingTop!==this.rsProperties.scrollPaddingTop&&(this.rsProperties.scrollPaddingTop=t.scrollPaddingTop),t.experiments!==this.rsProperties.experiments&&(this.rsProperties.experiments=t.experiments),this.lineLengths.update({fontFace:t.fontFamily,letterSpacing:t.letterSpacing,padding:t.scroll?(t.scrollPaddingLeft||0)+(t.scrollPaddingRight||0):(t.pageGutter||0)*2,wordSpacing:t.wordSpacing,optimalChars:t.optimalLineLength,minChars:t.minimalLineLength,maxChars:t.maximalLineLength});let e=this.updateLayout(t.fontSize,t.deprecatedFontSize||t.iOSPatch,t.scroll,t.columnCount);e!=null&&e.effectiveContainerWidth&&(this.effectiveContainerWidth=e==null?void 0:e.effectiveContainerWidth);let i={a11yNormalize:t.textNormalization,backgroundColor:t.backgroundColor,blendFilter:t.blendFilter,bodyHyphens:typeof t.hyphens!="boolean"?null:t.hyphens?"auto":"none",colCount:e==null?void 0:e.colCount,darkenFilter:t.darkenFilter,deprecatedFontSize:t.deprecatedFontSize,fontFamily:t.fontFamily,fontOpticalSizing:typeof t.fontOpticalSizing!="boolean"?null:t.fontOpticalSizing?"auto":"none",fontSize:t.fontSize,fontSizeNormalize:t.fontSizeNormalize,fontWeight:t.fontWeight,fontWidth:t.fontWidth,invertFilter:t.invertFilter,invertGaijiFilter:t.invertGaijiFilter,iOSPatch:t.iOSPatch,iPadOSPatch:t.iPadOSPatch,letterSpacing:t.letterSpacing,ligatures:typeof t.ligatures!="boolean"?null:t.ligatures?"common-ligatures":"none",lineHeight:t.lineHeight,lineLength:e==null?void 0:e.effectiveLineLength,linkColor:t.linkColor,noRuby:t.noRuby,paraIndent:t.paragraphIndent,paraSpacing:t.paragraphSpacing,selectionBackgroundColor:t.selectionBackgroundColor,selectionTextColor:t.selectionTextColor,textAlign:t.textAlign,textColor:t.textColor,view:typeof t.scroll!="boolean"?null:t.scroll?"scroll":"paged",visitedColor:t.visitedColor,wordSpacing:t.wordSpacing};this.userProperties=new qe(i)}updateLayout(t,e,i,o){return this.isCJKVertical?this.computeCJKVerticalLength(t,e):(i!=null?i:this.userProperties.view==="scroll")?this.computeScrollLength(t,e):this.paginate(t,e,o)}getCompensatedMetrics(t,e){let i=t||this.userProperties.fontSize||1,o=i<1?1/i:e?i:1;return{zoomFactor:i,zoomCompensation:o,optimal:Math.round(this.lineLengths.optimalLineLength)*i,minimal:this.lineLengths.minimalLineLength!==null?Math.round(this.lineLengths.minimalLineLength*i):null,maximal:this.lineLengths.maximalLineLength!==null?Math.round(this.lineLengths.maximalLineLength*i):null}}paginate(t,e,i){let o=Math.round(ke(this.containerParent)-this.constraint),r=this.getCompensatedMetrics(t,e),{zoomCompensation:s,optimal:a,minimal:l,maximal:h}=r,c=()=>o>=a&&h!==null?Math.min(Math.round(h*s),o):o,d=1,u=o;if(i===void 0)return{colCount:void 0,effectiveContainerWidth:u,effectiveLineLength:Math.round(u/d*s)};if(i===null)if(o>=a&&h!==null){d=Math.floor(o/a);let m=Math.round(d*(h*s));u=Math.min(m,o)}else u=c();else if(i>1){let m=Math.round(i*(l!==null?l:a));if(o>=m)if(d=i,h===null)u=o;else{let g=Math.round(d*(h*s));u=Math.min(g,o)}else if(l!==null&&o<Math.round(i*l))if(d=Math.floor(o/l),d<=1)d=1,u=c();else{let g=Math.round(d*(a*s));u=Math.min(g,o)}else{d=i;let g=Math.round(d*(a*s));u=Math.min(g,o)}}else d=1,u=c();return{colCount:d,effectiveContainerWidth:u,effectiveLineLength:Math.round(u/d/(t&&t>=1?t:1)*s)}}computeCJKVerticalLength(t,e){let i=Math.round(ke(this.containerParent)-this.constraint),o=Math.round(tl(this.containerParent)),r=this.getCompensatedMetrics(t,e),s=r.maximal!==null?Math.min(Math.round(r.maximal*r.zoomCompensation),o):o;return{colCount:void 0,effectiveContainerWidth:i,effectiveLineLength:s}}computeScrollLength(t,e){let i=Math.round(ke(this.containerParent)-this.constraint),o=this.getCompensatedMetrics(t&&(t<1||e)?t:1,e),r=o.zoomCompensation,s=o.optimal,a=o.maximal,l,h=i,c=Math.round(s*r);if(a===null)c=i;else{let d=Math.min(Math.round(a*r),i);c=e?d:Math.round(d*r)}return{colCount:l,effectiveContainerWidth:h,effectiveLineLength:c}}setContainerWidth(){this.container.style.width=`${this.effectiveContainerWidth}px`}resizeHandler(){let t=this.updateLayout(this.userProperties.fontSize,this.userProperties.deprecatedFontSize||this.userProperties.iOSPatch,this.userProperties.view==="scroll",this.cachedColCount);this.userProperties.colCount=t.colCount,this.userProperties.lineLength=t.effectiveLineLength,this.effectiveContainerWidth=t.effectiveContainerWidth,this.container.style.width=`${this.effectiveContainerWidth}px`}};p();p();var gd="modulepreload",fd=function(n){return"/"+n},el={},bt=function(n,t,e){let i=Promise.resolve();if(t&&t.length>0){let r=function(l){return Promise.all(l.map(h=>Promise.resolve(h).then(c=>({status:"fulfilled",value:c}),c=>({status:"rejected",reason:c}))))};document.getElementsByTagName("link");let s=document.querySelector("meta[property=csp-nonce]"),a=(s==null?void 0:s.nonce)||(s==null?void 0:s.getAttribute("nonce"));i=r(t.map(l=>{if(l=fd(l),l in el)return;el[l]=!0;let h=l.endsWith(".css"),c=h?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${l}"]${c}`))return;let d=document.createElement("link");if(d.rel=h?"stylesheet":gd,h||(d.as="script"),d.crossOrigin="",d.href=l,a&&d.setAttribute("nonce",a),document.head.appendChild(d),h)return new Promise((u,m)=>{d.addEventListener("load",u),d.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${l}`)))})}))}function o(r){let s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=r,window.dispatchEvent(s),!s.defaultPrevented)throw r}return i.then(r=>{for(let s of r||[])s.status==="rejected"&&o(s.reason);return n().catch(o)})};p();var il=`// Note: we aren't blocking some of the events right now to try and be as nonintrusive as possible.
// For a more comprehensive implementation, see https://github.com/hackademix/noscript/blob/3a83c0e4a506f175e38b0342dad50cdca3eae836/src/content/syncFetchPolicy.js#L142
// The snippet of code at the beginning of this source is an attempt at defence against JS using persistent storage
(function() {
    const noop = () => {}, emptyObj = {}, emptyPromise = () => Promise.resolve(void 0), fakeStorage = {
        getItem: noop, 
        setItem: noop, 
        removeItem: noop, 
        clear: noop, 
        key: noop, 
        length: 0
    };
    
    ["localStorage", "sessionStorage"].forEach((e) => Object.defineProperty(window, e, {
        get: () => fakeStorage,
        configurable: !0
    }));
    
    Object.defineProperty(document, "cookie", {
        get: () => "",
        set: noop,
        configurable: !0
    });
    
    Object.defineProperty(window, "indexedDB", {
        get: () => {},
        configurable: !0
    });
    
    Object.defineProperty(window, "caches", {
        get: () => emptyObj,
        configurable: !0
    });
    
    Object.defineProperty(navigator, "storage", {
        get: () => ({
            persist: emptyPromise,
            persisted: emptyPromise,
            estimate: () => Promise.resolve({quota: 0, usage: 0})
        }),
        configurable: !0
    });
    
    Object.defineProperty(navigator, "serviceWorker", {
        get: () => ({
            register: emptyPromise,
            getRegistration: emptyPromise,
            ready: emptyPromise()
        }),
        configurable: !0
    });

    window._readium_blockedEvents = [];
    window._readium_blockEvents = true;
    window._readium_eventBlocker = (e) => {
        if(!window._readium_blockEvents) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        _readium_blockedEvents.push([
            1, e, e.currentTarget || e.target
        ]);
    };
    window.addEventListener("DOMContentLoaded", window._readium_eventBlocker, true);
    window.addEventListener("load", window._readium_eventBlocker, true);
})();
`;async function kl(n,t){var a;let e=n.effectiveLayout===F.fixed,i=t.filter(l=>l.mediaType.isHTML).map(l=>l.href),o=i.length>0?i:[/\.xhtml$/,/\.html$/],r=[{id:"css-selector-generator",as:"script",target:"head",blob:new Blob([fo(Ia)],{type:"text/javascript"})},{id:"execution-prevention",as:"script",target:"head",blob:new Blob([fo(il)],{type:"text/javascript"}),condition:l=>!!(l.querySelector("script")||l.querySelector("body[onload]:not(body[onload=''])"))}],s=[{id:"onload-proxy",as:"script",target:"head",blob:new Blob([fo(Ha)],{type:"text/javascript"}),condition:l=>!!(l.querySelector("script")||l.querySelector("body[onload]:not(body[onload=''])"))}];if(!e){let l=ne(n),h,c,d;switch(l){case"rtl":{let[u,m,g]=await Promise.all([bt(()=>Promise.resolve().then(()=>(nl(),ol)),[]),bt(()=>Promise.resolve().then(()=>(sl(),rl)),[]),bt(()=>Promise.resolve().then(()=>(ll(),al)),[])]);h=u.default,c=m.default,d=g.default;break}case"cjk-horizontal":{let[u,m,g]=await Promise.all([bt(()=>Promise.resolve().then(()=>(cl(),hl)),[]),bt(()=>Promise.resolve().then(()=>(ul(),dl)),[]),bt(()=>Promise.resolve().then(()=>(pl(),ml)),[])]);h=u.default,c=m.default,d=g.default;break}case"cjk-vertical":case"mongolian-vertical":{let[u,m,g]=await Promise.all([bt(()=>Promise.resolve().then(()=>(fl(),gl)),[]),bt(()=>Promise.resolve().then(()=>(yl(),Sl)),[]),bt(()=>Promise.resolve().then(()=>(bl(),_l)),[])]);h=u.default,c=m.default,d=g.default;break}default:{let[u,m,g]=await Promise.all([bt(()=>Promise.resolve().then(()=>(wl(),vl)),[]),bt(()=>Promise.resolve().then(()=>(Cl(),Rl)),[]),bt(()=>Promise.resolve().then(()=>(xl(),El)),[])]);h=u.default,c=m.default,d=g.default;break}}if(r.unshift({id:"readium-css-before",as:"link",target:"head",blob:new Blob([Ri(h)],{type:"text/css"}),rel:"stylesheet"}),s.unshift({id:"readium-css-default",as:"link",target:"head",blob:new Blob([Ri(c)],{type:"text/css"}),rel:"stylesheet",condition:u=>!(u.querySelector("link[rel='stylesheet']")||u.querySelector("style")||u.querySelector("[style]:not([style=''])"))},{id:"readium-css-after",as:"link",target:"head",blob:new Blob([Ri(d)],{type:"text/css"}),rel:"stylesheet"}),(l==="cjk-horizontal"||l==="cjk-vertical")&&(n.description==="ebpaj-guide-1.0"||((a=n.otherMetadata)==null?void 0:a["ebpaj:guide-version"])!==void 0)){let{default:u}=await bt(async()=>{let{default:m}=await Promise.resolve().then(()=>(Fl(),Pl));return{default:m}},[]);s.push({id:"readium-css-ebpaj",as:"link",target:"head",blob:new Blob([Ri(u)],{type:"text/css"}),rel:"stylesheet"})}}return[{resources:o,prepend:r,append:s}]}p();var Ei=class{constructor(t,e){var i,o,r,s,a,l,h,c,d,u,m,g;this.backgroundColor=t.backgroundColor||e.backgroundColor||null,this.blendFilter=typeof t.blendFilter=="boolean"?t.blendFilter:(i=e.blendFilter)!=null?i:null,this.columnCount=t.columnCount!==void 0?t.columnCount:e.columnCount!==void 0?e.columnCount:null,this.constraint=t.constraint||e.constraint,this.darkenFilter=typeof t.darkenFilter=="boolean"?t.darkenFilter:(o=e.darkenFilter)!=null?o:null,this.deprecatedFontSize=typeof t.deprecatedFontSize=="boolean"?t.deprecatedFontSize:(r=e.deprecatedFontSize)!=null?r:null,this.fontFamily=t.fontFamily||e.fontFamily||null,this.fontSize=t.fontSize!==void 0?t.fontSize:e.fontSize!==void 0?e.fontSize:null,this.fontSizeNormalize=typeof t.fontSizeNormalize=="boolean"?t.fontSizeNormalize:(s=e.fontSizeNormalize)!=null?s:null,this.fontOpticalSizing=typeof t.fontOpticalSizing=="boolean"?t.fontOpticalSizing:(a=e.fontOpticalSizing)!=null?a:null,this.fontWeight=t.fontWeight!==void 0?t.fontWeight:e.fontWeight!==void 0?e.fontWeight:null,this.fontWidth=t.fontWidth!==void 0?t.fontWidth:e.fontWidth!==void 0?e.fontWidth:null,this.hyphens=typeof t.hyphens=="boolean"?t.hyphens:(l=e.hyphens)!=null?l:null,this.invertFilter=typeof t.invertFilter=="boolean"?t.invertFilter:(h=e.invertFilter)!=null?h:null,this.invertGaijiFilter=typeof t.invertGaijiFilter=="boolean"?t.invertGaijiFilter:(c=e.invertGaijiFilter)!=null?c:null,this.iOSPatch=this.deprecatedFontSize||t.iOSPatch===!1?!1:t.iOSPatch===!0?(Rt.OS.iOS||Rt.OS.iPadOS)&&Rt.iOSRequest==="mobile":e.iOSPatch,this.iPadOSPatch=this.deprecatedFontSize||t.iPadOSPatch===!1?!1:t.iPadOSPatch===!0?Rt.OS.iPadOS&&Rt.iOSRequest==="desktop":e.iPadOSPatch,this.letterSpacing=t.letterSpacing!==void 0?t.letterSpacing:e.letterSpacing!==void 0?e.letterSpacing:null,this.ligatures=typeof t.ligatures=="boolean"?t.ligatures:(d=e.ligatures)!=null?d:null,this.lineHeight=t.lineHeight!==void 0?t.lineHeight:e.lineHeight!==void 0?e.lineHeight:null,this.linkColor=t.linkColor||e.linkColor||null,this.maximalLineLength=t.maximalLineLength===null?null:t.maximalLineLength||e.maximalLineLength||null,this.minimalLineLength=t.minimalLineLength===null?null:t.minimalLineLength||e.minimalLineLength||null,this.noRuby=typeof t.noRuby=="boolean"?t.noRuby:(u=e.noRuby)!=null?u:null,this.optimalLineLength=t.optimalLineLength||e.optimalLineLength,this.pageGutter=t.pageGutter!==void 0?t.pageGutter:e.pageGutter!==void 0?e.pageGutter:null,this.paragraphIndent=t.paragraphIndent!==void 0?t.paragraphIndent:e.paragraphIndent!==void 0?e.paragraphIndent:null,this.paragraphSpacing=t.paragraphSpacing!==void 0?t.paragraphSpacing:e.paragraphSpacing!==void 0?e.paragraphSpacing:null,this.scroll=typeof t.scroll=="boolean"?t.scroll:(m=e.scroll)!=null?m:null,this.scrollPaddingTop=t.scrollPaddingTop!==void 0?t.scrollPaddingTop:e.scrollPaddingTop!==void 0?e.scrollPaddingTop:null,this.scrollPaddingBottom=t.scrollPaddingBottom!==void 0?t.scrollPaddingBottom:e.scrollPaddingBottom!==void 0?e.scrollPaddingBottom:null,this.scrollPaddingLeft=t.scrollPaddingLeft!==void 0?t.scrollPaddingLeft:e.scrollPaddingLeft!==void 0?e.scrollPaddingLeft:null,this.scrollPaddingRight=t.scrollPaddingRight!==void 0?t.scrollPaddingRight:e.scrollPaddingRight!==void 0?e.scrollPaddingRight:null,this.selectionBackgroundColor=t.selectionBackgroundColor||e.selectionBackgroundColor||null,this.selectionTextColor=t.selectionTextColor||e.selectionTextColor||null,this.textAlign=t.textAlign||e.textAlign||null,this.textColor=t.textColor||e.textColor||null,this.textNormalization=typeof t.textNormalization=="boolean"?t.textNormalization:(g=e.textNormalization)!=null?g:null,this.visitedColor=t.visitedColor||e.visitedColor||null,this.wordSpacing=t.wordSpacing!==void 0?t.wordSpacing:e.wordSpacing!==void 0?e.wordSpacing:null,this.experiments=e.experiments||null}};p();p();var Td="'Iowan Old Style', Sitka, 'Sitka Text', Palatino, 'Book Antiqua', 'URW Palladio L', P052, serif",Tl={oldStyleTf:Td};var zd=16,zl=Tl.oldStyleTf,Uo=class n{constructor(t){var e;this._optimalLineLength=null,this._canvas=document.createElement("canvas"),this._optimalChars=t.optimalChars,this._minChars=t.minChars,this._maxChars=t.maxChars,this._baseFontSize=t.baseFontSize||zd,this._fontFace=t.fontFace||zl,this._sample=t.sample||null,this._padding=(e=t.padding)!=null?e:0,this._letterSpacing=t.letterSpacing?Math.round(t.letterSpacing*this._baseFontSize):0,this._wordSpacing=t.wordSpacing?Math.round(t.wordSpacing*this._baseFontSize):0,this._isCJK=t.isCJK||!1,this._getRelative=t.getRelative||!1,this._minDivider=this._minChars&&this._minChars<this._optimalChars?this._optimalChars/this._minChars:this._minChars===null?null:1,this._maxMultiplier=this._maxChars&&this._maxChars>this._optimalChars?this._maxChars/this._optimalChars:this._maxChars===null?null:1,this._approximatedWordSpaces=n.approximateWordSpaces(this._optimalChars,this._sample)}updateMultipliers(){this._minDivider=this._minChars&&this._minChars<this._optimalChars?this._optimalChars/this._minChars:this._minChars===null?null:1,this._maxMultiplier=this._maxChars&&this._maxChars>this._optimalChars?this._maxChars/this._optimalChars:this._maxChars===null?null:1}update(t){var e;t.optimalChars&&(this._optimalChars=t.optimalChars),t.minChars!==void 0&&(this._minChars=t.minChars),t.maxChars!==void 0&&(this._maxChars=t.maxChars),t.baseFontSize&&(this._baseFontSize=t.baseFontSize),t.fontFace!==void 0&&(this._fontFace=t.fontFace||zl),t.letterSpacing&&(this._letterSpacing=t.letterSpacing),t.wordSpacing&&(this._wordSpacing=t.wordSpacing),t.isCJK!=null&&(this._isCJK=t.isCJK),t.padding!==void 0&&(this._padding=(e=t.padding)!=null?e:0),t.getRelative&&(this._getRelative=t.getRelative),t.sample&&(this._sample=t.sample,this._approximatedWordSpaces=n.approximateWordSpaces(this._optimalChars,this._sample)),this.updateMultipliers(),this._optimalLineLength=this.getOptimalLineLength()}get baseFontSize(){return this._baseFontSize}get minimalLineLength(){return this._optimalLineLength||(this._optimalLineLength=this.getOptimalLineLength()),this._minDivider!==null?Math.round(this._optimalLineLength/this._minDivider+this._padding)/(this._getRelative?this._baseFontSize:1):null}get maximalLineLength(){return this._optimalLineLength||(this._optimalLineLength=this.getOptimalLineLength()),this._maxMultiplier!==null?Math.round(this._optimalLineLength*this._maxMultiplier+this._padding)/(this._getRelative?this._baseFontSize:1):null}get optimalLineLength(){return this._optimalLineLength||(this._optimalLineLength=this.getOptimalLineLength()),Math.round(this._optimalLineLength+this._padding)/(this._getRelative?this._baseFontSize:1)}get all(){return this._optimalLineLength||(this._optimalLineLength=this.getOptimalLineLength()),{min:this.minimalLineLength,max:this.maximalLineLength,optimal:this.optimalLineLength,baseFontSize:this._baseFontSize}}static approximateWordSpaces(t,e){let i=0;if(e&&e.length>=t){let o=e.match(/([\s]+)/gi);i=(o?o.length:0)*(t/e.length)}return i}getLineLengthFallback(){let t=this._letterSpacing*(this._optimalChars-1),e=this._wordSpacing*this._approximatedWordSpaces;return this._optimalChars*(this._baseFontSize*.5)+t+e}getOptimalLineLength(){if(this._fontFace){if(typeof this._fontFace=="string")return this.measureText(this._fontFace);{let t=new FontFace(this._fontFace.name,`url(${this._fontFace.url})`);t.load().then(()=>(document.fonts.add(t),this.measureText(t.family)),e=>{})}}return this.getLineLengthFallback()}measureText(t){let e=this._canvas.getContext("2d");if(e&&t){let i=this._isCJK?"\u6C34".repeat(this._optimalChars):"0".repeat(this._optimalChars);if(e.font=`${this._baseFontSize}px ${t}`,this._sample&&this._sample.length>=this._optimalChars&&(i=this._sample.slice(0,this._optimalChars)),Object.hasOwn(e,"letterSpacing")&&Object.hasOwn(e,"wordSpacing"))return e.letterSpacing=this._letterSpacing.toString()+"px",e.wordSpacing=this._wordSpacing.toString()+"px",e.measureText(i).width;{let o=this._letterSpacing*(this._optimalChars-1),r=this._wordSpacing*n.approximateWordSpaces(this._optimalChars,this._sample);return e.measureText(i).width+o+r}}else return this.getLineLengthFallback()}};var Od=1e3,Ld="https://navigator.invalid/",Ad=n=>({frameLoaded:n.frameLoaded||(()=>{}),positionChanged:n.positionChanged||(()=>{}),viewportChanged:n.viewportChanged||(()=>{}),timelineItemChanged:n.timelineItemChanged||(()=>{}),tap:n.tap||(()=>!1),click:n.click||(()=>!1),zoom:n.zoom||(()=>{}),miscPointer:n.miscPointer||(()=>{}),scroll:n.scroll||(()=>{}),customEvent:n.customEvent||(()=>{}),handleLocator:n.handleLocator||(()=>!1),textSelected:n.textSelected||(()=>{}),contentProtection:n.contentProtection||(()=>{}),contextMenu:n.contextMenu||(()=>{}),peripheral:n.peripheral||(()=>{})});function Md(n,t){return n.length===t.length&&n.every((e,i)=>e===t[i])}var xi=class n extends lo{constructor(t,e,i,o=[],r=void 0,s={preferences:{},defaults:{}}){var u,m,g;super(),this._destroyed=!1,this._visibleFragmentIds=[],this._notifiedVisibleFragmentIds=[],this._timelineAugmented=!1,this._preferencesEditor=null,this._injector=null,this._isNavigating=!1,this._navigatorProtector=null,this._keyboardPeripheralsManager=null,this._suspiciousActivityListener=null,this._keyboardPeripheralListener=null,this._decorations=new Map,this._decorationObservers=new Map,this._decorationHoveredDecorations=new Map,this._decorationActivationState=new Map,this._decorationHoverState=new Map,this._decorationActivationConsumed=!1,this._navigationLocked=!1,this._pointedPieceRequests=new Map,this._pointedPieceRequestId=0,this.reflowViewport={readingOrder:[],progressions:new Map,positions:null},this.pub=e,this.container=t,this.listeners=Ad(i),this.currentLocation=r,o.length&&(this.positions=o),this._preferences=new Ut(s.preferences),this._defaults=new Mo(s.defaults),this._settings=new Ei(this._preferences,this._defaults);let a=ne(e.metadata),l=a==="cjk-horizontal",h=a==="cjk-vertical",c=h||a==="mongolian-vertical",d=l||h;this._css=new Do({rsProperties:new No({noVerticalPagination:c||void 0}),userProperties:new qe({}),lineLengths:new Uo({optimalChars:this._settings.optimalLineLength,minChars:this._settings.minimalLineLength,maxChars:this._settings.maximalLineLength,padding:this._settings.scroll?(this._settings.scrollPaddingLeft||0)+(this._settings.scrollPaddingRight||0):(this._settings.pageGutter||0)*2,fontFace:this._settings.fontFamily,letterSpacing:this._settings.letterSpacing,wordSpacing:this._settings.wordSpacing,isCJK:d}),container:t,constraint:this._settings.constraint,isCJKVertical:c}),this._layout=n.determineLayout(e,!!this._settings.scroll),this.currentProgression=e.metadata.effectiveReadingProgression,this._injectablesConfig=s.injectables||{rules:[],allowedDomains:[]},this._readiumRulesPromise=kl(e.metadata,e.readingOrder.items),this._contentProtection=s.contentProtection||{},this._decoratorConfig=s.decoratorConfig||{},this._decorationResizeSelectors=new Set((u=this._decoratorConfig.resizeWatchSelectors)!=null?u:[]),this._upgradeInsecureRequests=(m=s.upgradeInsecureRequests)!=null?m:"always",this._keyboardPeripherals=this.mergeKeyboardPeripherals(this._contentProtection,s.keyboardPeripherals||[]),(this._contentProtection.disableContextMenu||this._contentProtection.checkAutomation||this._contentProtection.checkIFrameEmbedding||this._contentProtection.monitorDevTools||(g=this._contentProtection.protectPrinting)!=null&&g.disable)&&(this._navigatorProtector=new wo(this._contentProtection),this._suspiciousActivityListener=b=>{let{type:S,...y}=b.detail;S==="context_menu"?this.listeners.contextMenu(y):this.listeners.contentProtection(S,y)},window.addEventListener(Ro,this._suspiciousActivityListener)),this._keyboardPeripherals.length>0&&(this._keyboardPeripheralsManager=new Co({keyboardPeripherals:this._keyboardPeripherals}),this._keyboardPeripheralListener=b=>{let S=b.detail;this.listeners.peripheral(S)},window.addEventListener(Eo,this._keyboardPeripheralListener)),this.resizeObserver=new ResizeObserver(()=>this.ownerWindow.requestAnimationFrame(async()=>await this.resizeHandler())),this.resizeObserver.observe(this.container.parentElement||document.documentElement)}static determineLayout(t,e){var r,s;let i=t.metadata.effectiveLayout;if(i===F.fixed)return F.fixed;if(t.metadata.otherMetadata&&"http://openmangaformat.org/schema/1.0#version"in t.metadata.otherMetadata)return F.fixed;if((s=(r=t.metadata)==null?void 0:r.conformsTo)!=null&&s.includes(St.DIVINA))return F.fixed;if(i===F.scrolled)return F.scrolled;let o=ne(t.metadata);return o==="cjk-vertical"||o==="mongolian-vertical"?F.scrolled:i===F.reflowable&&e?F.scrolled:F.reflowable}async load(){var t;if((t=this.positions)!=null&&t.length||(this.positions=await this.pub.positionsFromManifest()),!this._injector){let e=await this._readiumRulesPromise;this._injector=new go({rules:[...e,...this._injectablesConfig.rules],allowedDomains:this._injectablesConfig.allowedDomains})}if(!this._destroyed){if(this._layout===F.fixed)this.framePool=new Ao(this.container,this.positions,this.pub,this._layout,this._injector,this._contentProtection,this._keyboardPeripherals,[...this._decorationResizeSelectors],this._upgradeInsecureRequests),this.framePool.listener=(e,i)=>{this.eventListener(e,i)};else{if(await this.updateCSS(!1),this._destroyed)return;let e=this.compileCSSProperties(this._css);this.framePool=new xo(this.container,this.positions,e,this._injector,this._contentProtection,this._keyboardPeripherals,i=>this.pub.timeline.segmentsForHref(i).flatMap(o=>o.references).map(o=>{let r=o.indexOf("#");return r>=0?Gt(o.slice(r+1)):""}).filter(Boolean),[...this._decorationResizeSelectors],this._upgradeInsecureRequests)}if(this.currentLocation===void 0?this.currentLocation=this.positions[0]:this.currentLocation=this.completeLocator(this.currentLocation),await this.resizeHandler(),!this._destroyed)return new Promise(e=>{if(this._destroyed)return e(!1);this.go(this.currentLocation,!1,e)})}}get settings(){if(this._layout===F.fixed)return Object.freeze({...this._settings});{let t=this._css.userProperties.colCount||this._css.rsProperties.colCount||this._settings.columnCount;return Object.freeze({...this._settings,columnCount:t})}}get preferencesEditor(){return this._preferencesEditor===null&&(this._preferencesEditor=new Ci(this._preferences,this.settings,this.pub.metadata)),this._preferencesEditor}async submitPreferences(t){this._preferences=this._preferences.merging(t),await this.applyPreferences()}async applyPreferences(){let t=this._settings;this._settings=new Ei(this._preferences,this._defaults),this._preferencesEditor!==null&&(this._preferencesEditor=new Ci(this._preferences,this.settings,this.pub.metadata)),this._layout===F.fixed?this.handleFXLPrefs(t,this._settings):await this.updateCSS(!0)}handleFXLPrefs(t,e){t.columnCount!==e.columnCount&&(this.framePool.setPerPage(e.columnCount),this.ownerWindow.requestAnimationFrame(()=>this.notifyViewportChange(this.listeners.viewportChanged)))}async updateCSS(t){this._css.update(this._settings),t&&await this.commitCSS(this._css)}compileCSSProperties(t){let e={};for(let[i,o]of Object.entries(t.rsProperties.toCSSProperties()))e[i]=o;for(let[i,o]of Object.entries(t.userProperties.toCSSProperties()))e[i]=o;return e}async commitCSS(t){if(!this.framePool)return;let e=this.compileCSSProperties(t);this.framePool.setCSSProperties(e),this._css.userProperties.view==="paged"&&this._layout===F.scrolled?await this.setLayout(F.reflowable):this._css.userProperties.view==="scroll"&&this._layout===F.reflowable&&await this.setLayout(F.scrolled),this._css.setContainerWidth()}async resizeHandler(){let t=this.container.parentElement||document.documentElement;if(this._layout===F.fixed){let e=ke(t)-this._settings.constraint;if(Tt()?this.container.attributeStyleMap.set("width",CSS.px(e)):this.container.style.width=`${e}px`,!this.framePool)return;this.framePool.resizeHandler(),this.notifyViewportChange(this.listeners.viewportChanged)}else{let e=this._css.userProperties.colCount,i=this._css.userProperties.lineLength;this._css.resizeHandler(),(this._css.userProperties.view!=="scroll"&&e!==this._css.userProperties.colCount||i!==this._css.userProperties.lineLength)&&await this.commitCSS(this._css)}}get layout(){return this._layout}get ownerWindow(){return this.container.ownerDocument.defaultView||window}get _cframes(){var t,e;return((e=(t=this.framePool)==null?void 0:t.currentFrames)!=null?e:[]).filter(i=>!(i instanceof Dt&&i.isDestroyed))}get pool(){return this.framePool}eventListener(t,e,i){var o,r,s,a,l;switch(t){case"_pong":if(this.listeners.frameLoaded(this._cframes[0].iframe.contentWindow),this.listeners.positionChanged(this.currentLocation),this._notifyTimelineChange(this.currentLocation),i){let g=this._cframes.filter(S=>!!S).indexOf(i),b=g>=0?this.viewport.readingOrder[g]:void 0;b&&this._reapplyDecorationsToFrame(i,b)}else this._reapplyDecorationsToCurrentFrames();this._watchTextLayoutInCurrentFrame(!0),this._sendNavigationLock();break;case"text_layout":i&&i===this._textLayoutFrame&&this.currentLocation.href.split("#")[0]===((o=this._textLayoutWatch)==null?void 0:o.href)&&this._textLayoutWatch.cb(e);break;case"pointed_piece":{let{id:g,index:b}=e;(r=this._pointedPieceRequests.get(g))==null||r(b);break}case"first_visible_locator":let h=G.deserialize(e);if(!h)break;this.currentLocation=new G({href:this.currentLocation.href,type:this.currentLocation.type,title:this.currentLocation.title,locations:h==null?void 0:h.locations,text:h==null?void 0:h.text}),this.listeners.positionChanged(this.currentLocation),this._notifyTimelineChange(this.currentLocation);break;case"text_selected":{let g=e;if(i){let b=this._cframes.filter(y=>!!y).indexOf(i),S=b>=0?this.viewport.readingOrder[b]:void 0;if(S){let y=this.pub.readingOrder.findWithHref(S);g.locator=new G({href:S,type:y.type||"application/xhtml+xml",text:new Ct({highlight:g.text})})}}this.listeners.textSelected(g);break}case"decoration_activated":{this._handleDecorationActivated(e)&&(this._decorationActivationConsumed=!0);break}case"decoration_pointer_enter":this._handleDecorationPointerEnter(e);break;case"decoration_pointer_leave":this._handleDecorationPointerLeave(e);break;case"click":case"tap":if(this._decorationActivationConsumed){this._decorationActivationConsumed=!1;break}let c=e;if(c.interactiveElement){let g=new DOMParser().parseFromString(c.interactiveElement,"text/html").body.children[0];if(g.nodeType===g.ELEMENT_NODE&&g.nodeName==="A"&&g.hasAttribute("href")){let b=(s=g.attributes.getNamedItem("href"))==null?void 0:s.value;if(b.startsWith("#"))this._navigationLocked||this.go(this.currentLocation.copyWithLocations({fragments:[new URL(b,Ld).hash.slice(1)]}),!1,()=>{});else if(b.startsWith("http://")||b.startsWith("https://")||b.startsWith("mailto:")||b.startsWith("tel:"))this.listeners.handleLocator(new at({href:b}).locator);else if(!this._navigationLocked)try{this.goLink(new at({href:Jn.join(Jn.dirname(this.currentLocation.href),b)}),!1,()=>{})}catch(S){console.warn(`Couldn't go to link for ${b}: ${S}`),this.listeners.handleLocator(new at({href:b}).locator)}}else console.log("Clicked on",g)}else{if(this._layout===F.fixed&&this.framePool.doNotDisturb&&(c.doNotDisturb=!0),c.x+=this._spreadOffsetX(c.targetFrameSrc),t==="click"?this.listeners.click(c):this.listeners.tap(c))break;let g=(this._cframes.length===2?this._cframes[0].window.innerWidth+this._cframes[1].window.innerWidth:this._cframes[0].window.innerWidth)*window.devicePixelRatio/4;if(c.x>=g&&c.x<=g*3&&this.listeners.miscPointer(1),this._navigationLocked)break;c.x<g?this.goLeft(!1,()=>{}):c.x>g*3&&this.goRight(!1,()=>{})}break;case"tap_more":this.listeners.miscPointer(e);break;case"no_more":this._navigationLocked||this.changeResource(1);break;case"no_less":this._navigationLocked||this.changeResource(-1);break;case"swipe":break;case"scroll":this.listeners.scroll(e);break;case"zoom":this.listeners.zoom(e);break;case"progress":{let g=i instanceof Dt?this.framePool._frameFor(this.currentLocation.href.split("#")[0]):void 0;if(i instanceof Dt&&i!==g)break;this.syncLocation(e);break}case"content_protection":let d=e;this.listeners.contentProtection(d.type,d);break;case"context_menu":this.listeners.contextMenu(e);break;case"keyboard_peripherals":let u=e,m={...u,interactiveElement:void 0};u.interactiveElement&&(m.interactiveElement=new DOMParser().parseFromString(u.interactiveElement,"text/html").body.children[0]),this.listeners.peripheral(m);break;case"log":console.log((l=(a=this._cframes[0])==null?void 0:a.source)==null?void 0:l.split("/")[3],...e);break;default:this.listeners.customEvent(t,e);break}}determineModules(){let t=Array.from(Ke.keys());if(this._layout===F.fixed)return t.filter(o=>Wn.includes(o));t=t.filter(o=>Bn.includes(o));let e=ne(this.pub.metadata);if(e==="cjk-vertical"||e==="mongolian-vertical")return t.filter(o=>o!=="column_snapper"&&o!=="scroll_snapper");let i=t;return this._layout===F.scrolled?t=i.filter(o=>o!=="column_snapper"&&o!=="cjk_vertical_snapper"):t=i.filter(o=>o!=="scroll_snapper"&&o!=="cjk_vertical_snapper"),t}attachListener(){let t=this._cframes.filter(e=>!!e);if(t.length===0)throw Error("no cframe to attach listener to");t.forEach(e=>{e.msg&&(e.msg.listener=(i,o)=>{this.eventListener(i,o,e)})}),this._reapplyDecorationsToCurrentFrames(),this._watchTextLayoutInCurrentFrame(),this._sendNavigationLock()}async apply(){if(await this.framePool.update(this.pub,this.currentLocator,this.determineModules()),this.attachListener(),this.pub.readingOrder.findIndexWithHref(this.currentLocation.href)<0)throw Error("Link for "+this.currentLocation.href+" not found!");this.notifyViewportChange(this.listeners.viewportChanged)}supportsDecorationStyle(t){return Kn(t,this._decoratorConfig.decorationTemplates)}registerDecorationObserver(t,e){this._decorationObservers.has(t)||this._decorationObservers.set(t,new Set),this._decorationObservers.get(t).add(e),e.onDecorationActivated&&(this._decorationActivationState.set(t,!0),this._sendDecorationActivationToFrames(t,!0)),(e.onDecorationPointerEnter||e.onDecorationPointerLeave)&&(this._decorationHoverState.set(t,!0),this._sendDecorationHoverToFrames(t,!0))}unregisterDecorationObserver(t){this._decorationObservers.forEach((e,i)=>{if(!e.has(t))return;e.delete(t);let o=[...e].some(s=>s.onDecorationActivated);this._decorationActivationState.has(i)&&!o&&(this._decorationActivationState.delete(i),this._sendDecorationActivationToFrames(i,!1));let r=[...e].some(s=>s.onDecorationPointerEnter||s.onDecorationPointerLeave);this._decorationHoverState.has(i)&&!r&&(this._decorationHoverState.delete(i),this._sendDecorationHoverToFrames(i,!1))})}_sendDecorationActivationToFrames(t,e){this._cframes.filter(i=>!!i).forEach(i=>{i.msg&&i.msg.send("decoration_activatable",{group:t,activatable:e})})}_sendDecorationHoverToFrames(t,e){this._cframes.filter(i=>!!i).forEach(i=>{i.msg&&i.msg.send("decoration_hoverable",{group:t,hoverable:e})})}addDecorationResizeTarget(t){var e;this._decorationResizeSelectors.add(t),(e=this.framePool)==null||e.addResizeTarget(t)}removeDecorationResizeTarget(t){var e;this._decorationResizeSelectors.delete(t),(e=this.framePool)==null||e.removeResizeTarget(t)}applyDecorations(t,e){var d;let i=(d=this._decorations.get(e))!=null?d:[],o=new Map(i.map(u=>[u.id,u])),r=new Map(t.map(u=>[u.id,u])),s=[],a=[],l=[];for(let[u,m]of o)r.has(u)?Yn(m,r.get(u))||l.push(r.get(u)):s.push(u);for(let[u,m]of r)o.has(u)||a.push(m);this._decorations.set(e,t),this._sendDecorationOps(e,s,a,l,i);let h=this._decorationActivationState.get(e);h!==void 0&&this._sendDecorationActivationToFrames(e,h);let c=this._decorationHoverState.get(e);c!==void 0&&this._sendDecorationHoverToFrames(e,c)}_sendDecorationOps(t,e,i,o,r){let s=this._cframes.filter(h=>!!h),a=new Map(r.map(h=>[h.id,h])),l=this.viewport.readingOrder;s.forEach((h,c)=>{var u;if(!h.msg)return;let d=l[c];if(d){for(let m of e){let g=a.get(m);!g||g.locator.href!==d||h.msg.send("decorate",{group:t,action:"remove",decoration:{id:m}})}for(let m of i)m.locator.href===d&&h.msg.send("decorate",{group:t,action:"add",decoration:vi(m,this._decoratorConfig.decorationTemplates)});for(let m of o)((u=a.get(m.id))==null?void 0:u.locator.href)===d&&m.locator.href!==d&&h.msg.send("decorate",{group:t,action:"remove",decoration:{id:m.id}}),m.locator.href===d&&h.msg.send("decorate",{group:t,action:"update",decoration:vi(m,this._decoratorConfig.decorationTemplates)})}})}_reapplyDecorationsToFrame(t,e){if(t.msg){for(let[i,o]of this._decorations){let r=o.filter(s=>s.locator.href===e);t.msg.send("decorate",{group:i,action:"clear"});for(let s of r)t.msg.send("decorate",{group:i,action:"add",decoration:vi(s,this._decoratorConfig.decorationTemplates)})}for(let[i,o]of this._decorationActivationState)t.msg.send("decoration_activatable",{group:i,activatable:o});for(let[i,o]of this._decorationHoverState)t.msg.send("decoration_hoverable",{group:i,hoverable:o})}}_reapplyDecorationsToCurrentFrames(){let t=this._cframes.filter(i=>!!i),e=this.viewport.readingOrder;t.forEach((i,o)=>{let r=e[o];r&&this._reapplyDecorationsToFrame(i,r)})}watchTextLayout(t,e){var o,r;let i={href:(r=(o=t[0])==null?void 0:o.href.split("#")[0])!=null?r:"",pieces:t.map(s=>{var a;return[(a=s.text)==null?void 0:a.serialize(),$t(s.locations)]}),cb:e};return this._textLayoutWatch=i,this._watchTextLayoutInCurrentFrame(!0),()=>{this._textLayoutWatch===i&&(this._textLayoutWatch=void 0,this._watchTextLayoutInCurrentFrame())}}lockNavigation(t){this._navigationLocked=t,this._sendNavigationLock()}_sendNavigationLock(){this._cframes.forEach(t=>{var e;t instanceof Dt&&((e=t.msg)==null||e.send("lock_navigation",this._navigationLocked))})}_spreadOffsetX(t){var o,r,s,a;if(this._layout!==F.fixed||this.currentProgression!==D.rtl&&this.currentProgression!==D.ltr)return 0;let e=this.framePool.currentFrames;if(e.length<2)return 0;let i=this.currentProgression===D.rtl;return t!==((o=e[i?0:1])==null?void 0:o.source)?0:((a=(s=(r=e[i?1:0])==null?void 0:r.iframe.contentWindow)==null?void 0:s.innerWidth)!=null?a:0)*window.devicePixelRatio}async findPointedPiece(t,e){let i=this._cframes.filter(c=>!!c),o=i.findIndex(c=>c.source===t.targetFrameSrc),r=o>=0?this.viewport.readingOrder[o]:void 0;if(!r||!t.cssSelector)return;let s=e.filter(c=>c.href.split("#")[0]===r);if(s.length===0)return;let a=`${++this._pointedPieceRequestId}`,l,h=await new Promise(c=>{var u;this._pointedPieceRequests.set(a,c),l=setTimeout(()=>c(-1),Od);let d={id:a,cssSelector:t.cssSelector,x:t.x-this._spreadOffsetX(t.targetFrameSrc),y:t.y,pieces:s.map(m=>{var g;return[(g=m.text)==null?void 0:g.serialize(),$t(m.locations)]})};(u=i[o].msg)!=null&&u.send("pointed_piece",d,()=>c(-1))||c(-1)});return clearTimeout(l),this._pointedPieceRequests.delete(a),s[h]}_watchTextLayoutInCurrentFrame(t=!1){var s,a,l;let e=this._cframes[0],i=this._textLayoutWatch,o=i&&e instanceof Dt&&((s=this.currentLocation)==null?void 0:s.href.split("#")[0])===i.href?e:void 0;if(o===this._textLayoutFrame&&!t)return;let r=this._textLayoutFrame;r&&r!==o&&!r.isDestroyed&&((a=r.msg)==null||a.send("watch_text_layout",[])),this._textLayoutFrame=o,o&&i&&((l=o.msg)==null||l.send("watch_text_layout",i.pieces))}_handleDecorationActivated(t){var s,a;let e=this._decorationObservers.get(t.group);if(!e||e.size===0)return!1;let i=((s=this._decorations.get(t.group))!=null?s:[]).find(l=>l.id===t.decorationId);if(!i)return!1;let o={decoration:i,group:t.group,rect:t.rect,point:t.point},r=!1;for(let l of e)(a=l.onDecorationActivated)!=null&&a.call(l,o)&&(r=!0);return r}_handleDecorationPointerEnter(t){var r,s;let e=this._decorationObservers.get(t.group);if(!e||e.size===0)return;let i=((r=this._decorations.get(t.group))!=null?r:[]).find(a=>a.id===t.decorationId);if(!i)return;this._decorationHoveredDecorations.set(t.group,i);let o={decoration:i,group:t.group,rect:t.rect,point:t.point};for(let a of e)(s=a.onDecorationPointerEnter)==null||s.call(a,o)}_handleDecorationPointerLeave(t){var r,s,a;let e=this._decorationObservers.get(t.group);if(!e||e.size===0)return;let i=(s=((r=this._decorations.get(t.group))!=null?r:[]).find(l=>l.id===t.decorationId))!=null?s:this._decorationHoveredDecorations.get(t.group);if(this._decorationHoveredDecorations.delete(t.group),!i)return;let o={decoration:i,group:t.group,rect:t.rect,point:t.point};for(let l of e)(a=l.onDecorationPointerLeave)==null||a.call(l,o)}async destroy(){var t,e,i;this._destroyed=!0,this._suspiciousActivityListener&&window.removeEventListener(Ro,this._suspiciousActivityListener),this._keyboardPeripheralListener&&window.removeEventListener(Eo,this._keyboardPeripheralListener),(t=this._navigatorProtector)==null||t.destroy(),(e=this._keyboardPeripheralsManager)==null||e.destroy(),await((i=this.framePool)==null?void 0:i.destroy()),this._decorations.clear(),this._decorationObservers.clear(),this._decorationHoveredDecorations.clear(),this._decorationActivationState.clear(),this._decorationHoverState.clear(),this._decorationResizeSelectors.clear()}async changeResource(t){var o,r;if(t===0)return!1;if(this._layout===F.fixed){let s=this.framePool,a=s.viewport.positions[0];if(t===1){if(!s.next(s.perPage))return!1}else if(t===-1){if(!s.prev(s.perPage))return!1}else throw Error("Invalid relative value for FXL");let l=s.viewport.positions[0];if(a>l){for(let h=this.positions.length-1;h>=0;h--)if(this.positions[h].href===this.pub.readingOrder.items[l-1].href){this.currentLocation=this.positions[h].copyWithLocations({progression:.999999999999});break}}else if(a<l){for(let h=0;h<this.positions.length;h++)if(this.positions[h].href===this.pub.readingOrder.items[l-1].href){this.currentLocation=this.positions[h];break}}return await this.apply(),this.listeners.positionChanged(this.currentLocation),this._notifyTimelineChange(this.currentLocation),!0}let e=this.pub.readingOrder.findIndexWithHref(this.currentLocation.href),i=Math.max(0,Math.min(this.pub.readingOrder.items.length-1,e+t));if(i===e)return(r=(o=this._cframes[0])==null?void 0:o.msg)==null||r.send("shake",void 0,async s=>{}),!1;if(e>i){for(let s=this.positions.length-1;s>=0;s--)if(this.positions[s].href===this.pub.readingOrder.items[i].href){this.currentLocation=this.positions[s].copyWithLocations({progression:.999999999999});break}}else for(let s=0;s<this.positions.length;s++)if(this.positions[s].href===this.pub.readingOrder.items[i].href){this.currentLocation=this.positions[s];break}return await this.apply(),!0}findLastPositionInProgressionRange(t,e){let i=t.findLastIndex(o=>{let r=o.locations.progression;return!!(r&&r>e.start&&r<=e.end)});return i!==-1?t[i]:void 0}findNearestPositions(t){let e=this.positions.filter(s=>s.href===this.currentLocation.href),i=this.currentLocation,o,r=e.findLastIndex(s=>{var a;return((a=s.locations.progression)!=null?a:0)<=t.start});if(r!==-1){i=e[r];let s=e.slice(r+1);o=this.findLastPositionInProgressionRange(s,t)}return{first:i,last:o}}updateViewport(t){var e,i,o;this.reflowViewport.readingOrder=[],this.reflowViewport.progressions.clear(),this.reflowViewport.positions=null,this.currentLocation&&(this.reflowViewport.readingOrder.push(this.currentLocation.href),this.reflowViewport.progressions.set(this.currentLocation.href,t),((e=this.currentLocation.locations)==null?void 0:e.position)!==void 0&&(this.reflowViewport.positions=[this.currentLocation.locations.position],((o=(i=this.lastLocationInView)==null?void 0:i.locations)==null?void 0:o.position)!==void 0&&this.reflowViewport.positions.push(this.lastLocationInView.locations.position)))}async syncLocation(t){var s;let e=t,i=this.findNearestPositions(e);this.currentLocation=i.first.copyWithLocations({progression:e.start}),this.lastLocationInView=i.last,this.updateViewport(e),this.notifyViewportChange(this.listeners.viewportChanged),this.listeners.positionChanged(this.currentLocation);let o=e.fragmentId?this.currentLocation.copyWithLocations({fragments:[encodeURIComponent(e.fragmentId)]}):this.currentLocation;this._visibleFragmentIds=(s=e.visibleFragmentIds)!=null?s:[],this._notifyTimelineChange(o);let r=this._cframes;await this.framePool.update(this.pub,this.currentLocation,this.determineModules()),this._cframes.some((a,l)=>a&&a!==r[l])&&this.attachListener()}goBackward(t,e){var i,o;if(this._isNavigating){e(!1);return}this._isNavigating=!0,this._layout===F.fixed?this.changeResource(-1).then(r=>{this._isNavigating=!1,e(r)}).catch(r=>{console.error(r),this._isNavigating=!1,e(!1)}):(o=(i=this._cframes[0])==null?void 0:i.msg)==null||o.send("go_prev",void 0,async r=>{if(r)this._isNavigating=!1,e(!0);else{let s=await this.changeResource(-1);this._isNavigating=!1,e(s)}})}goForward(t,e){var i,o;if(this._isNavigating){e(!1);return}this._isNavigating=!0,this._layout===F.fixed?this.changeResource(1).then(r=>{this._isNavigating=!1,e(r)}).catch(r=>{console.error(r),this._isNavigating=!1,e(!1)}):(o=(i=this._cframes[0])==null?void 0:i.msg)==null||o.send("go_next",void 0,async r=>{if(r)this._isNavigating=!1,e(!0);else{let s=await this.changeResource(1);this._isNavigating=!1,e(s)}})}get currentLocator(){return this.currentLocation}get viewport(){return this._layout===F.fixed?this.framePool?this.framePool.viewport:{readingOrder:[],progressions:new Map,positions:null}:this.reflowViewport}get isScrollStart(){var e;let t=this.viewport.readingOrder[0];return((e=this.viewport.progressions.get(t))==null?void 0:e.start)===0}get isScrollEnd(){var e;let t=this.viewport.readingOrder[this.viewport.readingOrder.length-1];return((e=this.viewport.progressions.get(t))==null?void 0:e.end)===1}get canGoBackward(){var e,i;let t=(e=this.pub.readingOrder.items[0])==null?void 0:e.href;return!(this.viewport.progressions.has(t)&&((i=this.viewport.progressions.get(t))==null?void 0:i.start)===0)}get canGoForward(){var e,i;let t=(e=this.pub.readingOrder.items[this.pub.readingOrder.items.length-1])==null?void 0:e.href;return!(this.viewport.progressions.has(t)&&((i=this.viewport.progressions.get(t))==null?void 0:i.end)===1)}get readingProgression(){return this.currentProgression}async setLayout(t){this._layout!==t&&(this._layout=t,await this.framePool.update(this.pub,this.currentLocator,this.determineModules(),!0),this.attachListener())}get publication(){return this.pub}get timeline(){var e;let t=this.pub.timeline;if(!this._timelineAugmented&&((e=this.positions)!=null&&e.length)){let i=this.positions,o=new Set;t.augment((r,s)=>{var m;if((m=r.children)!=null&&m.length)return{};let a=s.href.indexOf("#"),l=a>=0?s.href.slice(0,a):s.href,h=a>=0?s.href.slice(a+1):void 0,c=i.filter(g=>g.href===l);if(!c.length)return{};let d=h?c.find(g=>{var b;return((b=g.locations.fragments)==null?void 0:b[0])===h}):void 0,u;return d?u=d:o.has(l)?u=void 0:(o.add(l),u=c.reduce((g,b)=>{var S,y;return((S=b.locations.position)!=null?S:1/0)<((y=g.locations.position)!=null?y:1/0)?b:g})),u?{position:u.locations.position,scroll:d==null?void 0:d.locations.progression}:{}}),this._timelineAugmented=!0}return this._wrappedTimeline||(this._wrappedTimeline=new Proxy(t,{get:(i,o)=>{if(o!=="navigableFrom"){let r=Reflect.get(i,o,i);return typeof r=="function"?r.bind(i):r}return r=>{var d,u;let s=this._visibleFragmentIds,a=(d=s.length?i.locate(this.currentLocation.copyWithLocations({fragments:[encodeURIComponent(s[0])]})):void 0)!=null?d:r,l=(u=s.length?i.locate(this.currentLocation.copyWithLocations({fragments:[encodeURIComponent(s[s.length-1])]})):void 0)!=null?u:r;if(this.isScrollStart){let m=i.ancestors(a).find(g=>g.references.includes(this.currentLocation.href));m&&(a=m)}let h=i.navigableFrom(a).previous,c=i.navigableFrom(l).next;return{previous:h,next:c}}}})),this._wrappedTimeline}async loadLocator(t,e){var a,l;let i=!1,o=$t(t.locations);if((a=t.text)!=null&&a.highlight?i=await new Promise((h,c)=>{var d,u;this._cframes[0].msg.send("go_text",o?[(d=t.text)==null?void 0:d.serialize(),o]:(u=t.text)==null?void 0:u.serialize(),m=>h(m))}):o&&(i=await new Promise((h,c)=>{this._cframes[0].msg.send("go_text",["",o],d=>h(d))})),i){e(i);return}let r=hi(t.locations);if(r&&(i=await new Promise((h,c)=>{this._cframes[0].msg.send("go_id",r,d=>h(d))})),i){e(i);return}let s=(l=t.locations)==null?void 0:l.progression;s&&s>0?i=await new Promise((h,c)=>{this._cframes[0].msg.send("go_progression",s,d=>h(d))}):i=!0,e(i)}completeLocator(t){var e,i;if(!t.href){let o=!1;if(typeof t.locations.position=="number"){let r=this.positions.find(s=>s.locations.position===t.locations.position);r&&(t=r.copyWithLocations(t.locations),o=!0)}if(!o&&typeof((e=t.locations)==null?void 0:e.totalProgression)=="number"){let r=t.locations.totalProgression,s=0,a=1/0;for(let l=0;l<this.positions.length;l++){let h=(i=this.positions[l].locations.totalProgression)!=null?i:l/this.positions.length,c=Math.abs(h-r);c<a&&(a=c,s=l)}t=this.positions[s].copyWithLocations(t.locations)}}return t}go(t,e,i){t=this.completeLocator(t);let o=t.href.split("#")[0],r=this.pub.readingOrder.findWithHref(o);if(!r)return i(this.listeners.handleLocator(t));if(this._isNavigating){i(!1);return}this._isNavigating=!0,this.currentLocation=this.positions.find(s=>s.href===r.href),this.apply().then(()=>this.loadLocator(t,s=>{this._isNavigating=!1,i(s)})).then(()=>{this.attachListener()}).catch(s=>{console.error(s),this._isNavigating=!1,i(!1)})}goLink(t,e,i){return this.go(t.locator,e,i)}_notifyTimelineChange(t){let e=this.timeline.locate(t),i=!Md(this._visibleFragmentIds,this._notifiedVisibleFragmentIds);(e!==this._currentTimelineItem||i)&&(this._currentTimelineItem=e,this._notifiedVisibleFragmentIds=this._visibleFragmentIds,this.listeners.timelineItemChanged(e))}};p();var Et=Uint8Array,Je=Uint16Array,Nd=Int32Array,Ol=new Et([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),Ll=new Et([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),Dd=new Et([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),Al=function(n,t){for(var e=new Je(31),i=0;i<31;++i)e[i]=t+=1<<n[i-1];for(var o=new Nd(e[30]),i=1;i<30;++i)for(var r=e[i];r<e[i+1];++r)o[r]=r-e[i]<<5|i;return{b:e,r:o}},Ml=Al(Ol,2),Nl=Ml.b,Ud=Ml.r;Nl[28]=258,Ud[258]=28;var Dl=Al(Ll,0),Id=Dl.b,Uw=Dl.r,dr=new Je(32768);for(I=0;I<32768;++I)Kt=(I&43690)>>1|(I&21845)<<1,Kt=(Kt&52428)>>2|(Kt&13107)<<2,Kt=(Kt&61680)>>4|(Kt&3855)<<4,dr[I]=((Kt&65280)>>8|(Kt&255)<<8)>>1;var Kt,I,Pi=function(n,t,e){for(var i=n.length,o=0,r=new Je(t);o<i;++o)n[o]&&++r[n[o]-1];var s=new Je(t);for(o=1;o<t;++o)s[o]=s[o-1]+r[o-1]<<1;var a;if(e){a=new Je(1<<t);var l=15-t;for(o=0;o<i;++o)if(n[o])for(var h=o<<4|n[o],c=t-n[o],d=s[n[o]-1]++<<c,u=d|(1<<c)-1;d<=u;++d)a[dr[d]>>l]=h}else for(a=new Je(i),o=0;o<i;++o)n[o]&&(a[o]=dr[s[n[o]-1]++]>>15-n[o]);return a},Fi=new Et(288);for(I=0;I<144;++I)Fi[I]=8;var I;for(I=144;I<256;++I)Fi[I]=9;var I;for(I=256;I<280;++I)Fi[I]=7;var I;for(I=280;I<288;++I)Fi[I]=8;var I,Ul=new Et(32);for(I=0;I<32;++I)Ul[I]=5;var I;var Hd=Pi(Fi,9,1);var Wd=Pi(Ul,5,1),lr=function(n){for(var t=n[0],e=1;e<n.length;++e)n[e]>t&&(t=n[e]);return t},zt=function(n,t,e){var i=t/8|0;return(n[i]|n[i+1]<<8)>>(t&7)&e},hr=function(n,t){var e=t/8|0;return(n[e]|n[e+1]<<8|n[e+2]<<16)>>(t&7)},Bd=function(n){return(n+7)/8|0},mr=function(n,t,e){return(t==null||t<0)&&(t=0),(e==null||e>n.length)&&(e=n.length),new Et(n.subarray(t,e))};var jd=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],kt=function(n,t,e){var i=new Error(t||jd[n]);if(i.code=n,Error.captureStackTrace&&Error.captureStackTrace(i,kt),!e)throw i;return i},Gd=function(n,t,e,i){var o=n.length,r=i?i.length:0;if(!o||t.f&&!t.l)return e||new Et(0);var s=!e,a=s||t.i!=2,l=t.i;s&&(e=new Et(o*3));var h=function(Or){var Lr=e.length;if(Or>Lr){var Ar=new Et(Math.max(Lr*2,Or));Ar.set(e),e=Ar}},c=t.f||0,d=t.p||0,u=t.b||0,m=t.l,g=t.d,b=t.m,S=t.n,y=o*8;do{if(!m){c=zt(n,d,1);var f=zt(n,d+1,3);if(d+=3,f)if(f==1)m=Hd,g=Wd,b=9,S=5;else if(f==2){var C=zt(n,d,31)+257,z=zt(n,d+10,15)+4,k=C+zt(n,d+5,31)+1;d+=14;for(var T=new Et(k),O=new Et(19),x=0;x<z;++x)O[Dd[x]]=zt(n,d+x*3,7);d+=z*3;for(var P=lr(O),A=(1<<P)-1,U=Pi(O,P,1),x=0;x<k;){var M=U[zt(n,d,A)];d+=M&15;var w=M>>4;if(w<16)T[x++]=w;else{var N=0,V=0;for(w==16?(V=3+zt(n,d,3),d+=2,N=T[x-1]):w==17?(V=3+zt(n,d,7),d+=3):w==18&&(V=11+zt(n,d,127),d+=7);V--;)T[x++]=N}}var J=T.subarray(0,C),Q=T.subarray(C);b=lr(J),S=lr(Q),m=Pi(J,b,1),g=Pi(Q,S,1)}else kt(1);else{var w=Bd(d)+4,R=n[w-4]|n[w-3]<<8,v=w+R;if(v>o){l&&kt(0);break}a&&h(u+R),e.set(n.subarray(w,v),u),t.b=u+=R,t.p=d=v*8,t.f=c;continue}if(d>y){l&&kt(0);break}}a&&h(u+131072);for(var le=(1<<b)-1,Li=(1<<S)-1,Te=d;;Te=d){var N=m[hr(n,d)&le],Wt=N>>4;if(d+=N&15,d>y){l&&kt(0);break}if(N||kt(2),Wt<256)e[u++]=Wt;else if(Wt==256){Te=d,m=null;break}else{var ii=Wt-254;if(Wt>264){var x=Wt-257,qt=Ol[x];ii=zt(n,d,(1<<qt)-1)+Nl[x],d+=qt}var ze=g[hr(n,d)&Li],Oe=ze>>4;ze||kt(3),d+=ze&15;var Q=Id[Oe];if(Oe>3){var qt=Ll[Oe];Q+=hr(n,d)&(1<<qt)-1,d+=qt}if(d>y){l&&kt(0);break}a&&h(u+131072);var Tr=u+ii;if(u<Q){var zr=r-Q,uh=Math.min(Q,Tr);for(zr+u<0&&kt(3);u<uh;++u)e[u]=i[zr+u]}for(;u<Tr;++u)e[u]=e[u-Q]}}t.l=m,t.p=Te,t.b=u,t.f=c,m&&(c=1,t.m=b,t.d=g,t.n=S)}while(!c);return u!=e.length&&s?mr(e,0,u):e.subarray(0,u)};var Vd=new Et(0);var It=function(n,t){return n[t]|n[t+1]<<8},Ot=function(n,t){return(n[t]|n[t+1]<<8|n[t+2]<<16|n[t+3]<<24)>>>0},cr=function(n,t){return Ot(n,t)+Ot(n,t+4)*4294967296};function $d(n,t){return Gd(n,{i:2},t&&t.out,t&&t.dictionary)}var ur=typeof TextDecoder!="undefined"&&new TextDecoder,Xd=0;try{ur.decode(Vd,{stream:!0}),Xd=1}catch{}var Kd=function(n){for(var t="",e=0;;){var i=n[e++],o=(i>127)+(i>223)+(i>239);if(e+o>n.length)return{s:t,r:mr(n,e-1)};o?o==3?(i=((i&15)<<18|(n[e++]&63)<<12|(n[e++]&63)<<6|n[e++]&63)-65536,t+=String.fromCharCode(55296|i>>10,56320|i&1023)):o&1?t+=String.fromCharCode((i&31)<<6|n[e++]&63):t+=String.fromCharCode((i&15)<<12|(n[e++]&63)<<6|n[e++]&63):t+=String.fromCharCode(i)}};function pr(n,t){if(t){for(var e="",i=0;i<n.length;i+=16384)e+=String.fromCharCode.apply(null,n.subarray(i,i+16384));return e}else{if(ur)return ur.decode(n);var o=Kd(n),r=o.s,e=o.r;return e.length&&kt(8),r}}var Yd=function(n,t){return t+30+It(n,t+26)+It(n,t+28)},qd=function(n,t,e){var i=It(n,t+28),o=pr(n.subarray(t+46,t+46+i),!(It(n,t+8)&2048)),r=t+46+i,s=Ot(n,t+20),a=e&&s==4294967295?Jd(n,r):[s,Ot(n,t+24),Ot(n,t+42)],l=a[0],h=a[1],c=a[2];return[It(n,t+10),l,h,o,r+It(n,t+30)+It(n,t+32),c]},Jd=function(n,t){for(;It(n,t)!=1;t+=4+It(n,t+2));return[cr(n,t+12),cr(n,t+4),cr(n,t+20)]};function gr(n,t){for(var e={},i=n.length-22;Ot(n,i)!=101010256;--i)(!i||n.length-i>65558)&&kt(13);var o=It(n,i+8);if(!o)return{};var r=Ot(n,i+16),s=r==4294967295||o==65535;if(s){var a=Ot(n,i-12);s=Ot(n,a)==101075792,s&&(o=Ot(n,a+32),r=Ot(n,a+48))}for(var l=t&&t.filter,h=0;h<o;++h){var c=qd(n,r,s),d=c[0],u=c[1],m=c[2],g=c[3],b=c[4],S=c[5],y=Yd(n,S);r=b,(!l||l({name:g,size:u,originalSize:m,compression:d}))&&(d?d==8?e[g]=$d(n.subarray(y,y+u),{out:new Et(m)}):kt(14,"unknown compression type "+d):e[g]=mr(n,y,y+u))}return e}p();var Zd=()=>/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu,Il=n=>n.toLowerCase().replace(/’/g,"'").replace(/'/g,""),Qd=new Set(["SCRIPT","STYLE","NOSCRIPT","RT","RP"]);function yr(n){let t=[],e=n.body||n.documentElement;if(!e)return t;let i=n.createTreeWalker(e,NodeFilter.SHOW_TEXT,{acceptNode:h=>{for(let c=h.parentNode;c&&c!==e;c=c.parentNode)if(Qd.has((c.nodeName||"").toUpperCase()))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT}}),o=[],r;for(;r=i.nextNode();)o.push(r);let s=/^(P|DIV|LI|H[1-6]|BLOCKQUOTE|TD|TH|SECTION|ARTICLE|BODY|DD|DT|PRE|FIGCAPTION|TR|TABLE|UL|OL)$/,a=h=>{let c=h.parentNode;for(;c&&c!==e&&!s.test((c.nodeName||"").toUpperCase());)c=c.parentNode;return c},l=null;for(let h=0;h<o.length;h++){let c=o[h];l&&a(l.node)!==a(c)&&(l=null);let d=Zd(),u,m=!0;for(;(u=d.exec(c.data))!==null;){if(m&&l&&u.index===0){if(l.norm+=Il(u[0]),m=!1,u.index+u[0].length===c.data.length)continue;l=null;continue}m=!1;let g={node:c,start:u.index,end:u.index+u[0].length,norm:Il(u[0])};t.push(g),l=g.end===c.data.length?g:null}m&&(l=null)}return t}function fr(n,t){let i=(S,y)=>S[y]+""+S[y+1]+""+S[y+2]+""+S[y+3];if(n.length<4||t.length<4)return[];let o=S=>{let y=new Map;for(let f=0;f<=S.length-4;f++){let w=i(S,f);y.set(w,y.has(w)?-1:f)}return y},r=o(n),s=o(t),a=[];for(let[S,y]of r){if(y<0)continue;let f=s.get(S);f!==void 0&&f>=0&&a.push([y,f])}a.sort((S,y)=>S[0]-y[0]);let l=[],h=new Int32Array(a.length).fill(-1);for(let S=0;S<a.length;S++){let y=a[S][1],f=0,w=l.length;for(;f<w;){let R=f+w>>1;a[l[R]][1]<y?f=R+1:w=R}f>0&&(h[S]=l[f-1]),f===l.length?l.push(S):l[f]=S}let c=[];for(let S=l.length?l[l.length-1]:-1;S>=0;S=h[S])c.push(a[S]);c.reverse();let d=[],u=-1,m=-1;for(let[S,y]of c){let f=S,w=y;for(;f-1>u&&w-1>m&&n[f-1]===t[w-1];)f--,w--;for(;f<n.length&&w<t.length&&n[f]===t[w];f++,w++)f<=u||w<=m||(d.push([f,w]),u=f,m=w)}let g=[],b=25e4;for(let S=0;S<d.length&&(g.push(d[S]),!(S+1>=d.length));S++){let[y,f]=d[S],[w,R]=d[S+1],v=w-y-1,C=R-f-1;if(v<=0||C<=0||v*C>b)continue;let z=C+1,k=new Uint16Array((v+1)*z);for(let O=v-1;O>=0;O--)for(let x=C-1;x>=0;x--)k[O*z+x]=n[y+1+O]===t[f+1+x]?k[(O+1)*z+x+1]+1:Math.max(k[(O+1)*z+x],k[O*z+x+1]);let T=[];for(let O=0,x=0;O<v&&x<C;)n[y+1+O]===t[f+1+x]?(T.push([y+1+O,f+1+x]),O++,x++):k[(O+1)*z+x]>=k[O*z+x+1]?O++:x++;T.forEach((O,x)=>{let P=x>0&&T[x-1][0]===O[0]-1&&T[x-1][1]===O[1]-1||x+1<T.length&&T[x+1][0]===O[0]+1&&T[x+1][1]===O[1]+1;(n[O[0]].length>=4||P)&&g.push(O)})}return g}var Sr=null,tu="absplus-readalong",Hl=12;function eu(n,t){let e=2166136261,i=o=>{for(let r=0;r<o.length;r++)e=Math.imul(e^o.charCodeAt(r),16777619);e=Math.imul(e^31,16777619)};for(let o of n)i(o);e=Math.imul(e^2654435769,16777619);for(let o of t)i(o);return`${n.length}:${t.length}:${(e>>>0).toString(36)}`}function Wl(){return new Promise(n=>{try{let t=indexedDB.open(tu,1);t.onupgradeneeded=()=>t.result.createObjectStore("pairs"),t.onsuccess=()=>n(t.result),t.onerror=()=>n(null)}catch{n(null)}})}async function iu(n){let t=await Wl();return t?new Promise(e=>{try{let i=t.transaction("pairs").objectStore("pairs").get(n);i.onsuccess=()=>e(i.result||null),i.onerror=()=>e(null)}catch{e(null)}}):null}async function ou(n,t){let e=await Wl();if(e)try{let i=new Int32Array(t.length*2);t.forEach((l,h)=>{i[h*2]=l[0],i[h*2+1]=l[1]});let o=e.transaction("pairs","readwrite"),r=o.objectStore("pairs");r.put({at:Date.now(),flat:i},n);let s=r.getAll(),a=r.getAllKeys();o.oncomplete=()=>{let l=(s.result||[]).map((c,d)=>({at:c.at,key:a.result[d]})).sort((c,d)=>d.at-c.at);if(l.length<=Hl)return;let h=e.transaction("pairs","readwrite").objectStore("pairs");l.slice(Hl).forEach(c=>h.delete(c.key))}}catch{}}async function Bl(n,t,{fresh:e=!1}={}){let i=null;try{i=eu(n,t);let r=e?null:await iu(i);if(r&&r.flat){let s=new Array(r.flat.length/2);for(let a=0;a<s.length;a++)s[a]=[r.flat[a*2],r.flat[a*2+1]];return s}}catch{}let o=await nu(n,t);return i&&o.length&&ou(i,o),o}function nu(n,t){return typeof Worker=="undefined"||typeof Blob=="undefined"||typeof URL=="undefined"||!URL.createObjectURL?Promise.resolve(fr(n,t)):new Promise(e=>{let i=null,o=()=>{i&&i.terminate(),e(fr(n,t))};try{if(!Sr){let r=`const align = (${fr.toString()})
onmessage = (m) => postMessage(align(m.data.t, m.data.e))`;Sr=URL.createObjectURL(new Blob([r],{type:"text/javascript"}))}i=new Worker(Sr),i.onmessage=r=>{i.terminate(),e(r.data)},i.onerror=o,i.postMessage({t:n,e:t})}catch{o()}})}function jl(n,t){let e=0,i=n.length-1,o=-1;for(;e<=i;){let r=e+i>>1;n[r]<=t?(o=r,e=r+1):i=r-1}return o}function _r(n,t){return e=>{let i=n.length;if(!i)return-1;let o=jl(n,e);if(o<0)return Math.max(0,t[0]-(n[0]-e));if(n[o]===e||o===i-1)return t[o]+(e-n[o]);let r=n[o+1]-n[o],s=t[o+1]-t[o];return r===s?t[o]+(e-n[o]):Math.min(t[o]+(e-n[o]),t[o+1]-1)}}function br(n,t){let e=[];for(let i=0;i+1<n.length;i++){let o=n[i+1]-n[i];t[i+1]-t[i]-o>=Yt&&e.push([t[i]+o,t[i+1]])}return e}function Gl(n,t,e=0){let i=[];if(!n.length)return i;n[0]>=Yt&&i.push({at:t[0],from:0,to:n[0]});for(let r=0;r+1<n.length;r++){let s=n[r+1]-n[r],a=t[r+1]-t[r];s-a>=Yt&&i.push({at:t[r+1],from:n[r]+a,to:n[r+1]})}let o=n.length-1;return e-1-n[o]>=Yt&&i.push({at:t[o]+1,from:n[o]+1,to:e}),i}function Vl(n,t){let e=n.slice(t.from,t.to);return e.length>70?e.slice(0,70).join(" ")+" \u2026":e.join(" ")}function $l(n,t){if(!n.length)return()=>!1;let e=br(n,t),i=t[0],o=t[t.length-1];return r=>r<i-Yt||r>o+Yt||e.some(([s,a])=>r>=s&&r<a)}var Xl=`.abs-added{display:inline-block;width:3px;height:1.15em;vertical-align:text-bottom;background:#e53935;background-clip:content-box;border-radius:2px;padding:0 11px;margin:0 -9px;cursor:pointer;position:relative;-webkit-tap-highlight-color:transparent}
.abs-added.open::after{content:"Added in the audiobook: \\201C" attr(data-added) "\\201D";position:absolute;bottom:calc(100% + 6px);left:-4px;width:max-content;max-width:min(20em,76vw);white-space:normal;font:600 0.8em/1.4 system-ui,-apple-system,Roboto,sans-serif;font-style:normal;text-indent:0;text-align:left;letter-spacing:normal;text-transform:none;color:#fff;background:rgba(30,30,30,0.97);border-left:3px solid #e53935;border-radius:10px;padding:8px 11px;box-shadow:0 6px 18px rgba(0,0,0,0.35);z-index:50;pointer-events:none}
.abs-added.open.below::after{bottom:auto;top:calc(100% + 6px)}
.abs-added.open.right::after{left:auto;right:-4px}`;function Io(n,t){if(n){if(!t){n.classList.remove("open");return}try{let e=n.ownerDocument.defaultView,i=n.getBoundingClientRect(),o=e.getComputedStyle(n.ownerDocument.documentElement),r=parseFloat(o.columnWidth)||0,s=parseFloat(o.columnGap)||0,a=r>0?r+s:e.innerWidth,l=a>0?(i.left%a+a)%a:i.left;n.classList.toggle("below",i.top<120),n.classList.toggle("right",l>a*.55)}catch{}n.classList.add("open")}}var Yt=6;function Kl(n,t){return e=>{if(!n.length)return!1;if(e<n[0]-Yt||e>n[n.length-1]+Yt)return!0;let i=jl(n,e);if(i<0||i>=n.length-1)return!1;let o=n[i+1]-n[i],r=t[i+1]-t[i];return o-r>=Yt&&e-n[i]>=r}}p();var Ho=!1;function Yl(n,t){return"none"}var ru=n=>new Promise(t=>{let e=()=>--n<=0?t():requestAnimationFrame(e);requestAnimationFrame(e)});async function ql(n,{style:t,fromRight:e,paper:i,turn:o,drawn:r}){let s=window.AbsTurnHost;if(!s||t==="none"||Ho)return Ho&&s&&s.cancel().catch(()=>{}),o();Ho=!0;let a=!1;try{let l=await s.begin({style:t,forward:n>0,fromRight:e,paper:i||"#ffffff"});a=!!(l&&l.ok)}catch{}try{if(await o(),!a)return;await Promise.race([r(),new Promise(l=>setTimeout(l,900))]),await ru(2),await s.finish({duration:t==="fade"?260:t==="slide"?320:450})}catch{a&&s.cancel().catch(()=>{})}finally{Ho=!1}}var Bo="https://book.absplus.invalid/",Jl="http://www.w3.org/1999/xlink",vr=()=>/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu,Zl=n=>n.toLowerCase().replace(/’/g,"'").replace(/'/g,""),ot=(n,t)=>{try{typeof window.absHost=="function"&&window.absHost(n,t||{})}catch{}},su={xhtml:"application/xhtml+xml",html:"text/html",htm:"text/html",xml:"application/xml",css:"text/css",js:"text/javascript",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp",svg:"image/svg+xml",avif:"image/avif",otf:"font/otf",ttf:"font/ttf",woff:"font/woff",woff2:"font/woff2",mp3:"audio/mpeg",mp4:"video/mp4",m4a:"audio/mp4",ncx:"application/x-dtbncx+xml",opf:"application/oebps-package+xml"},wr=class{constructor(t){this.u8=t,this.sizes=new Map,gr(t,{filter:e=>(this.sizes.set(e.name,e.originalSize||0),!1)}),this.names=[...this.sizes.keys()],this.lower=new Map(this.names.map(e=>[e.toLowerCase(),e])),this.blobs=new Map,this.types=new Map}has(t){return this.sizes.has(t)||this.lower.has(String(t).toLowerCase())}real(t){return this.sizes.has(t)?t:this.lower.get(String(t).toLowerCase())||t}bytes(t){let e=this.real(t);return gr(this.u8,{filter:o=>o.name===e})[e]||null}text(t){let e=this.bytes(t);return e?pr(e):null}type(t){return this.types.get(this.real(t))||su[(t.split(".").pop()||"").toLowerCase()]||"application/octet-stream"}url(t,e=0){let i=this.real(t);if(this.blobs.has(i))return this.blobs.get(i);if(!this.has(i))return null;let o,r=this.type(i);r==="text/css"&&e<4?o=new Blob([Rr(this.text(i)||"",i,this,e+1)],{type:r}):o=new Blob([this.bytes(i)],{type:r});let s=URL.createObjectURL(o);return this.blobs.set(i,s),s}};function Qe(n,t){if(!t)return null;let e=String(t).trim();if(!e||e.startsWith("#")||/^[a-z][a-z0-9+.-]*:/i.test(e))return null;try{let i=new URL(e,"https://z.invalid/"+n);return decodeURIComponent(i.pathname.slice(1))}catch{return null}}function Rr(n,t,e,i){return n.replace(/@import\s+(['"])([^'"]+)\1/g,(o,r,s)=>{let a=Qe(t,s),l=a&&e.url(a,i);return l?`@import url("${l}")`:o}).replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g,(o,r,s)=>{let a=Qe(t,s),l=a&&e.url(a,i);return l?`url("${l}")`:o})}function jo(n,t){let e=new DOMParser().parseFromString(n,t==="text/html"?"text/html":"application/xhtml+xml");return e.querySelector("parsererror")?new DOMParser().parseFromString(n,"text/html"):e}function au(n,t){let e=jo(n.text(t)||"",n.type(t)),i=(o,r,s)=>{let a=s?o.getAttributeNS(s,r):o.getAttribute(r),l=Qe(t,a),h=l&&n.url(l);h&&(s?o.setAttributeNS(s,"xlink:"+r,h):o.setAttribute(r,h))};return e.querySelectorAll("img[src], source[src], video[src], audio[src], embed[src], input[src], track[src]").forEach(o=>i(o,"src")),e.querySelectorAll("img[srcset], source[srcset]").forEach(o=>o.removeAttribute("srcset")),e.querySelectorAll("[poster]").forEach(o=>i(o,"poster")),e.querySelectorAll("link[href]").forEach(o=>{/stylesheet/i.test(o.getAttribute("rel")||"")&&i(o,"href")}),e.querySelectorAll("image, use").forEach(o=>{o.hasAttribute("href")&&i(o,"href"),o.hasAttributeNS(Jl,"href")&&i(o,"href",Jl)}),e.querySelectorAll("object[data]").forEach(o=>i(o,"data")),e.querySelectorAll("style").forEach(o=>o.textContent=Rr(o.textContent||"",t,n,1)),e.querySelectorAll("[style]").forEach(o=>{let r=o.getAttribute("style");/url\(/i.test(r)&&o.setAttribute("style",Rr(r,t,n,1))}),e.querySelectorAll("script").forEach(o=>o.remove()),e}var oh=n=>{let t=String(n||"");t.startsWith(Bo)&&(t=t.slice(Bo.length)),t=t.split("#")[0].split("?")[0];try{t=decodeURIComponent(t)}catch{}return t.replace(/^\/+/,"")},Cr=class extends ni{constructor(t,e){super(),this.zip=t,this._link=e,this.path=oh(e.href)}async link(){return this._link}async length(){return this.zip.sizes.get(this.zip.real(this.path))}async read(t){let e=this.zip.bytes(this.path);if(e)return t?e.subarray(t.start,t.endInclusive+1):e}async readAsString(){return this.zip.text(this.path)||void 0}async readAsXML(){if(this.zip.has(this.path))return au(this.zip,this.zip.real(this.path))}close(){}},Er=class{constructor(t,e){this.zip=t,this._links=e}links(){return this._links}get(t){return new Cr(this.zip,t)}close(){}},ki=n=>n?(n.textContent||"").replace(/\s+/g," ").trim():"",Ht=(n,t)=>[...n.getElementsByTagNameNS("*",t)],Ze=(n,t)=>[...n.children].find(e=>e.localName===t);function lu(n){let t=n.text("META-INF/container.xml");if(!t)throw new Error("This isn't an EPUB (no META-INF/container.xml)");let e=new DOMParser().parseFromString(t,"application/xml"),i=Ht(e,"rootfile")[0],o=i&&i.getAttribute("full-path");if(!o||!n.has(o))throw new Error("The EPUB has no package file");let r=new DOMParser().parseFromString(n.text(o),"application/xml"),s=new Map;for(let P of Ht(r,"item")){let A=Qe(o,P.getAttribute("href"));if(!A)continue;let U={id:P.getAttribute("id"),path:A,type:P.getAttribute("media-type")||n.type(A),props:P.getAttribute("properties")||""};s.set(U.id,U),n.types.set(n.real(A),U.type)}let a=Ht(r,"spine")[0],l=Ht(r,"itemref").map(P=>({item:s.get(P.getAttribute("idref")),linear:P.getAttribute("linear")!=="no"})).filter(P=>P.item&&/html|xml/.test(P.item.type)&&n.has(P.item.path));if(!l.length)throw new Error("The EPUB has no chapters");let h=Ht(r,"metadata")[0]||r,c=ki(Ht(h,"title")[0])||"Book",d=ki(Ht(h,"language")[0])||void 0,u=a&&a.getAttribute("page-progression-direction")==="rtl",m=Ht(h,"meta").some(P=>P.getAttribute("property")==="rendition:layout"&&ki(P)==="pre-paginated"),g=[],b=[...s.values()].find(P=>/\bnav\b/.test(P.props));if(b&&n.has(b.path)){let P=jo(n.text(b.path),"application/xhtml+xml"),A=[...P.getElementsByTagName("nav")].find(M=>/\btoc\b/.test(M.getAttribute("epub:type")||M.getAttributeNS("http://www.idpf.org/2007/ops","type")||M.getAttribute("role")||""))||P.getElementsByTagName("nav")[0],U=M=>[...M?M.children:[]].filter(N=>N.localName==="li").map(N=>{let V=Ze(N,"a")||Ze(N,"span"),J=V&&V.getAttribute("href")?Qe(b.path,V.getAttribute("href").split("#")[0]):null,Q=V&&V.getAttribute("href")&&V.getAttribute("href").includes("#")?"#"+V.getAttribute("href").split("#")[1]:"";return{title:ki(V)||"\u2026",href:J?J+Q:null,children:U(Ze(N,"ol"))}});A&&(g=U(Ze(A,"ol")||A.getElementsByTagName("ol")[0]))}if(!g.length){let P=a&&a.getAttribute("toc"),A=P&&s.get(P)||[...s.values()].find(U=>U.type==="application/x-dtbncx+xml");if(A&&n.has(A.path)){let U=new DOMParser().parseFromString(n.text(A.path),"application/xml"),M=V=>[...V.children].filter(J=>J.localName==="navPoint").map(J=>{let Q=(Ht(J,"content")[0]||{getAttribute:()=>""}).getAttribute("src")||"",le=Qe(A.path,Q.split("#")[0]);return{title:ki(Ze(Ze(J,"navLabel")||J,"text"))||"\u2026",href:le?le+(Q.includes("#")?"#"+Q.split("#")[1]:""):null,children:M(J)}}),N=Ht(U,"navMap")[0];N&&(g=M(N))}}let S=P=>P.split("/").map(encodeURIComponent).join("/"),y=P=>P&&S(P.split("#")[0])+(P.includes("#")?"#"+P.split("#")[1]:""),f=l.map(P=>({href:S(P.item.path),type:P.item.type==="text/html"?"text/html":"application/xhtml+xml",properties:P.linear?void 0:{linear:!1}})),w=new Set(l.map(P=>P.item.path)),R=[...s.values()].filter(P=>!w.has(P.path)).map(P=>({href:S(P.path),type:P.type})),v=P=>P.filter(A=>A.href).map(A=>({href:y(A.href),title:A.title,children:v(A.children)})),C=di.deserialize({"@context":"https://readium.org/webpub-manifest/context.jsonld",metadata:{title:c,language:d?[d]:void 0,readingProgression:u?"rtl":"ltr",conformsTo:"https://readium.org/webpub-manifest/profiles/epub",presentation:m?{layout:"fixed"}:void 0},links:[{rel:"self",href:Bo+"manifest.json",type:"application/webpub+json"}],readingOrder:f,resources:R,toc:v(g)});if(!C)throw new Error("Couldn't read this book's contents");let z=[...C.readingOrder.items,...C.resources.items],k=new mi({manifest:C,fetcher:new Er(n,z)}),T=[],O=[];l.forEach((P,A)=>{let U=Math.max(1,Math.ceil((n.sizes.get(n.real(P.item.path))||0)/1024));O.push(T.length+1);for(let M=0;M<U;M++)T.push({href:f[A].href,type:f[A].type,locations:{progression:M/U,position:T.length+1}})});let x=T.length;return T.forEach(P=>P.locations.totalProgression=(P.locations.position-1)/x),{publication:k,spine:l,toc:g,rtl:u,fixed:m,title:c,language:d,positions:T,sectionFirstPosition:O}}function nh(){let n=_.book,t=new Map(n.spine.map((i,o)=>[i.item.path,o])),e=i=>(i||[]).map(o=>{let r=o.href?t.get(o.href.split("#")[0]):void 0;return{title:o.title,href:o.href,page:r!==void 0?n.sectionFirstPosition[r]:null,children:e(o.children)}});return e(n.toc)}var _={zip:null,book:null,nav:null,frames:new Map,docWords:new WeakMap,sec:0,progression:0,page:1,playing:!1,follow:!0,userNavAt:0,settings:{},theme:{bg:"#121212",fg:"#e8e8e8",highlight:"rgba(255, 213, 79, 0.45)",eink:!1},ra:null,lastKey:"",turning:!1,reading:!1,lookupWnd:null},rh=n=>{let t=oh(n);return _.book?_.book.spine.findIndex(e=>e.item.path===t||encodeURI(e.item.path)===t):-1};function hu(n){try{let t=n.document.querySelector("base[data-readium]")||n.document.querySelector("base");return t?rh(t.getAttribute("href")||t.href):-1}catch{return-1}}function Wo(n){let t=_.frames.get(n);try{if(t&&t.document&&t.frameElement&&t.frameElement.isConnected)return t}catch{}return null}function xr(){let n=_.book;if(!n)return{page:0,total:0};let t=n.sectionFirstPosition[_.sec]||1,e=_.sec+1<n.sectionFirstPosition.length?n.sectionFirstPosition[_.sec+1]:n.positions.length+1,i=Math.min(e-1,t+Math.round(_.progression*(e-t)));return{page:Math.max(1,i),total:n.positions.length}}function sh(){let n=_.book;if(!n)return"";let t="",e=n.spine[_.sec]&&n.spine[_.sec].item.path,i=a=>{for(let l of a)l.href&&l.href.split("#")[0]===e&&!t&&(t=l.title),i(l.children||[])};if(i(n.toc),t)return t;let o=new Map(n.spine.map((a,l)=>[a.item.path,l])),r=-1,s=a=>{for(let l of a){let h=l.href?o.get(l.href.split("#")[0]):void 0;h!==void 0&&h<=_.sec&&h>=r&&(r=h,t=l.title),s(l.children||[])}};return s(n.toc),t}function Ql(){let{page:n,total:t}=xr();_.wantPage&&Math.abs(n-_.wantPage)<=4?n=_.wantPage:_.wantPage=0,_.page=n,ot("position",{page:n,total:t,chapter:sh(),section:_.sec,progression:_.progression,follow:_.follow})}var ah=()=>{try{return window.matchMedia("(pointer: coarse)").matches}catch{return!0}};function lh(n){let t=n.document,e=t.getElementById("absplus-ra-style");e||(e=t.createElement("style"),e.id="absplus-ra-style",(t.head||t.documentElement).appendChild(e));let i=_.theme.box?"transparent":_.theme.highlight,o=_.theme.box?_.theme.boxUnderline?_.theme.underline:"":_.theme.underline;e.textContent=`::highlight(absplus-ra) { background-color: ${i}; color: inherit;${o?` text-decoration: underline ${o}; text-decoration-thickness: 2px; text-underline-offset: 3px;`:""} }
    ::highlight(absplus-skip) { color: rgba(128, 128, 128, 0.75); text-decoration: line-through rgba(128, 128, 128, 0.45); }
    ::highlight(absplus-lookup) { background-color: ${_.theme.lookup||"rgba(66, 153, 225, 0.45)"}; color: inherit; text-decoration: underline; }
    ${ah()?"html, body { -webkit-user-select: none !important; user-select: none !important; -webkit-touch-callout: none !important; }":""} html, body { -webkit-tap-highlight-color: transparent; }`}function th(n,t,e){let i=null;if(n.caretRangeFromPoint)i=n.caretRangeFromPoint(t,e);else if(n.caretPositionFromPoint){let l=n.caretPositionFromPoint(t,e);l&&(i=n.createRange(),i.setStart(l.offsetNode,l.offset))}if(!i||!i.startContainer||i.startContainer.nodeType!==3)return null;let o=i.startContainer,r=i.startOffset,s=vr(),a;for(;(a=s.exec(o.data))!==null;)if(a.index<=r&&r<=a.index+a[0].length){let l=n.createRange();l.setStart(o,a.index),l.setEnd(o,a.index+a[0].length);let h=l.getBoundingClientRect();return t<h.left-12||t>h.right+12||e<h.top-12||e>h.bottom+12?null:{word:a[0],node:o,start:a.index,end:a.index+a[0].length,range:l}}return null}function cu(n,t){let e=n.document;if(e.__absplus)return;e.__absplus=!0;let i=null,o=0,r=0,s=()=>n.innerWidth||e.documentElement.clientWidth||1;e.addEventListener("pointerdown",l=>{i={x:l.clientX,y:l.clientY,at:Date.now()},clearTimeout(o),o=setTimeout(()=>{if(!i)return;let h=th(e,i.x,i.y);if(!h||!_.reading||_.playing)return;r=Date.now(),eh(n,h.range);let c=Pr(e,t,h),d=h.range.getBoundingClientRect(),u=n.frameElement?n.frameElement.getBoundingClientRect():{left:0,top:0};ot("lookup",{word:h.word,time:c,x:u.left+d.left+d.width/2,y:u.top+d.top})},550)},!0),e.addEventListener("pointermove",l=>{i&&Math.hypot(l.clientX-i.x,l.clientY-i.y)>10&&clearTimeout(o)},!0);let a=l=>{clearTimeout(o);let h=i;if(i=null,!h||l.type==="pointercancel"||l.target&&l.target.closest&&l.target.closest(".abs-added")||Date.now()-r<900)return;let c=l.clientX-h.x,d=l.clientY-h.y;if(Math.abs(c)>45&&Math.abs(c)>Math.abs(d)*1.5){let y=c<0!=!!(_.book&&_.book.rtl);return ei(y?1:-1)}if(Math.hypot(c,d)>12||Date.now()-h.at>500)return;let u=l.clientX,m=s(),g=e.activeElement;if(l.target&&l.target.closest&&l.target.closest("a[href]"))return;if(u<m*.22)return ei(_.book&&_.book.rtl?1:-1);if(u>m*.78)return ei(_.book&&_.book.rtl?-1:1);if(_.reading)return ot("tap",{});let b=th(e,l.clientX,l.clientY),S=b?Pr(e,t,b):null;if(S!=null&&_.ra&&_.ra.noAudio&&_.ra.noAudio(_.ra.lastTapWord)){ot("noaudio",{}),g&&g.blur&&g.blur();return}S!=null?(_.userNavAt=0,ti(!0),ot("seek",{t:S})):ot("tap",{}),g&&g.blur&&g.blur()};e.addEventListener("pointerup",a,!0),e.addEventListener("pointercancel",a,!0),e.addEventListener("contextmenu",l=>ah()&&l.preventDefault(),!0),e.addEventListener("mouseup",l=>{if(!_.reading||_.playing)return;let h=n.getSelection&&n.getSelection(),c=h&&!h.isCollapsed?String(h).trim():"";if(!c||c.length>60||c.split(/\s+/).length>3)return;let d=h.getRangeAt(0);eh(n,d.cloneRange());let u=d.getBoundingClientRect(),m=n.frameElement?n.frameElement.getBoundingClientRect():{left:0,top:0};r=Date.now(),ot("lookup",{word:c.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,""),time:null,x:m.left+u.left+u.width/2,y:m.top+u.top}),setTimeout(()=>h.removeAllRanges(),0)},!0)}function Ti(){_.userNavAt=Date.now(),_.ra&&_.playing&&ti(!1)}function ti(n){_.follow!==n&&(_.follow=n,_.lastKey="",ot("follow",{follow:n}))}var du=()=>new Promise(n=>{_.onNextPosition=n,setTimeout(n,1200)});function ei(n,t){if(!_.nav)return Promise.resolve();_.wantPage=0,t||Ti();let e=_.nav,i=Yl(_.settings,_.theme.eink);if(!window.AbsTurnHost&&i!=="none"){let o=document.getElementById("book");return new Promise(r=>n>0?e.goForward(!1,r):e.goBackward(!1,r)).then(()=>{try{let r=n>0!=!!(_.book&&_.book.rtl)?36:-36;o.animate([{transform:"translateX("+r+"px)",opacity:.35},{transform:"translateX(0)",opacity:1}],{duration:220,easing:"ease-out"})}catch{}})}return ql(n,{style:i,fromRight:n>0!=!!(_.book&&_.book.rtl),paper:_.theme.paper||_.theme.bg,turn:()=>new Promise(o=>n>0?e.goForward(!1,o):e.goBackward(!1,o)),drawn:du})}function zi(n,t){let e=_.book;if(!e||!_.nav||!e.spine[n])return Promise.resolve(!1);let i=e.publication.readingOrder.items[n],o=G.deserialize({href:i.href,type:i.type||"application/xhtml+xml",locations:{progression:Math.max(0,Math.min(.999,t||0))}});return new Promise(r=>_.nav.go(o,!1,r))}function uu(n){let t=[],e=[],i=[];return n.forEach(o=>{let r=o.t||"",s=typeof o.e=="number"&&o.e>o.s?o.e:o.s+2,a=vr(),l=[],h;for(;(h=a.exec(r))!==null;)l.push({n:Zl(h[0]),at:h.index,raw:h[0]});let c=[];if(Array.isArray(o.w))for(let[u,m,g]of o.w){let b=String(u).match(vr())||[];b.forEach((S,y)=>c.push({n:Zl(S),t:b.length>1?m+(g-m)*y/b.length:m}))}let d=0;l.forEach((u,m)=>{let g=null;if(c.length===l.length)g=c[m].t;else for(let b=d;b<Math.min(c.length,d+4);b++)if(c[b].n===u.n){g=c[b].t,d=b+1;break}t.push(u.n),e.push(u.raw),i.push(g!=null?g:o.s+u.at/Math.max(1,r.length)*(s-o.s))})}),{tNorm:t,tTime:i,tRaw:e}}async function mu(n,t={}){let e=_.book;if(!e||!n||!n.length)return ot("status",{state:"no-transcript"});if(e.fixed)return ot("status",{state:"unavailable",reason:"fixed-layout"});let i={};_.aligning=i,ot("status",{state:"aligning",progress:0,step:"transcript"});let o={start:performance.now()};window.__raTimings=o;let{tNorm:r,tTime:s,tRaw:a}=uu(n);o.transcript=Math.round(performance.now()-o.start);let l=[],h=[],c=[],d=[],u=[];for(let R=0;R<e.spine.length;R++){if(_.aligning!==i)return;u.push(l.length);let v=0;if(e.spine[R].linear)try{let C=jo(_.zip.text(e.spine[R].item.path)||"",_.zip.type(e.spine[R].item.path)),z=yr(C);for(let k=0;k<z.length;k++)l.push(z[k].norm),h.push(R),c.push(k);v=z.length}catch{}d.push(v),R%4===3&&(ot("status",{state:"aligning",progress:R/e.spine.length,step:"book"}),await new Promise(C=>setTimeout(C,0)))}o.book=Math.round(performance.now()-o.start),ot("status",{state:"aligning",progress:1,step:"match",words:r.length+l.length});let m=await Bl(r,l,{fresh:!!t.fresh});if(o.match=Math.round(performance.now()-o.start),_.aligning!==i)return;let g=r.length?m.length/r.length:0;if(m.length<50)return ot("status",{state:"unavailable",reason:"no-match",matched:g});let b=m.map(R=>R[0]),S=m.map(R=>R[1]),y=new Map;for(let[R,v]of br(b,S))for(let C=R;C<v;){let z=h[C],k=C;for(;k+1<v&&h[k+1]===z;)k++;y.has(z)||y.set(z,[]),y.get(z).push([c[C],c[k]]),C=k+1}let f=new Map,w=[];Gl(b,S,r.length).forEach((R,v)=>{let C=Math.min(l.length-1,R.at);f.has(h[C])||f.set(h[C],[]),f.get(h[C]).push({pid:v,idx:c[C],text:Vl(a,R)}),w.push({pid:v,from:R.from-2,to:R.to})}),_.ra={addedSpans:w,addedEls:new Map,addedOpen:-1,noAudio:$l(b,S),added:f,skipped:y,skipPainted:new WeakSet,t2e:_r(b,S),e2t:_r(S,b),offBook:Kl(b,S),isOffBook:!1,tTime:s,eSec:h,eIdx:c,eCount:l.length,secCount:d,secStart:u},_.lastKey="",hh(),o.done=Math.round(performance.now()-o.start),ot("status",{state:"ready",matched:g})}function pu(n){let t=_.ra.tTime,e=0,i=t.length-1,o=-1;for(;e<=i;){let r=e+i>>1;t[r]<=n+.05?(o=r,e=r+1):i=r-1}return o}function gu(n,t){let e=_.ra&&_.ra.added&&_.ra.added.get(t);if(!e||!e.length)return;if(!n.getElementById("absplus-added-style")){let r=n.createElement("style");r.id="absplus-added-style",r.textContent=Xl,(n.head||n.documentElement).appendChild(r)}let i=Oi(n),o=e.map(r=>({...r,w:i[Math.min(r.idx,i.length-1)]})).filter(r=>r.w);o.sort((r,s)=>s.idx-r.idx);for(let r of o)try{let s=n.createRange();s.setStart(r.w.node,r.w.start),s.collapse(!0);let a=n.createElement("span");a.className="abs-added",a.setAttribute("role","button"),a.setAttribute("aria-label","The narrator adds lines here: tap to see them"),a.dataset.added=r.text,a.addEventListener("click",l=>{l.stopPropagation(),l.preventDefault(),Io(a,!a.classList.contains("open"))}),s.insertNode(a),_.ra.addedEls.set(r.pid,a)}catch{}_.docWords.delete(n)}function hh(){let n=_.ra;if(!(!n||(!n.skipped||!n.skipped.size)&&(!n.added||!n.added.size)))for(let[t,e]of _.frames)try{let i=e&&e.document;if(!i||n.skipPainted.has(i)||(n.skipPainted.add(i),gu(i,t),!kr(e)))continue;let o=n.skipped.get(t);if(!o)continue;let r=Oi(i);if(!r.length)continue;let s=[];for(let[a,l]of o){let h=r[Math.min(a,r.length-1)],c=r[Math.min(l,r.length-1)];if(!h||!c)continue;let d=i.createRange();d.setStart(h.node,h.start),d.setEnd(c.node,c.end),s.push(d)}s.length&&e.CSS.highlights.set("absplus-skip",new e.Highlight(...s))}catch{}}function Oi(n){let t=_.docWords.get(n);return t||(t=yr(n),_.docWords.set(n,t)),t}function Pr(n,t,e){let i=_.ra;if(!i||t<0)return null;let o=Oi(n),r=o.findIndex(a=>a.node===e.node&&a.start<=e.start&&e.start<Math.max(a.end,a.start+1));if(r<0&&(r=o.findIndex(a=>a.node===e.node)),r<0)return null;i.lastTapWord=i.secStart[t]+r;let s=Math.max(0,Math.min(i.tTime.length-1,i.e2t(i.secStart[t]+r)));return i.tTime[s]}var kr=n=>!!(n&&n.CSS&&n.CSS.highlights&&n.Highlight);function Go(n,t,e,i){if(!n)return;let o=t==="absplus-ra"&&_.theme.box;try{if(kr(n)&&(e?n.CSS.highlights.set(t,new n.Highlight(e)):n.CSS.highlights.delete(t),!o))return}catch{}let r=n.document,s=r.getElementById(t);if(!e){s&&(s.style.display="none");return}s||(s=r.createElement("div"),s.id=t,s.setAttribute("data-readium","true"),s.setAttribute("aria-hidden","true"),s.style.cssText="position:fixed;pointer-events:none;z-index:2147483646;border-radius:3px;display:none",(r.documentElement||r.body).appendChild(s));let a=e.getClientRects(),l=a.length?a[0]:e.getBoundingClientRect();if(o){s.style.background=_.theme.highlight,s.style.border=`1.5px solid ${_.theme.underline||i}`,s.style.borderRadius="6px",s.style.boxSizing="border-box";let h=_.theme.boxUnderline?7:2;s.style.left=`${l.left-4}px`,s.style.top=`${l.top-2}px`,s.style.width=`${l.width+8}px`,s.style.height=`${l.height+2+h}px`,s.style.display=l.width?"block":"none";return}s.style.background=i,_.theme.underline&&(s.style.borderBottom=`2px solid ${_.theme.underline}`),s.style.left=`${l.left-1}px`,s.style.top=`${l.top}px`,s.style.width=`${l.width+2}px`,s.style.height=`${l.height}px`,s.style.display=l.width?"block":"none"}function eh(n,t){Fr(),Go(n,"absplus-lookup",t,_.theme.lookup||"rgba(66, 153, 225, 0.45)"),_.lookupWnd=n}function Fr(){try{_.lookupWnd&&Go(_.lookupWnd,"absplus-lookup",null)}catch{}_.lookupWnd=null}function ih(){for(let n of _.frames.values())try{Go(n,"absplus-ra",null)}catch{}}function fu(n){let t=_.ra;if(!t||!_.nav||_.turning||_.reading||Su())return;let e=pu(n);if(e<0)return;let i=!!t.offBook(e);i!==t.isOffBook&&(t.isOffBook=i,ot("offbook",{off:i}));let o=t.addedSpans.find(v=>e>=v.from&&e<v.to),r=o?o.pid:-1;if(r!==t.addedOpen){let v=t.addedEls.get(t.addedOpen);v&&v.dataset.auto&&(Io(v,!1),delete v.dataset.auto);let C=r>=0&&t.addedEls.get(r);C&&!C.classList.contains("open")&&(Io(C,!0),C.dataset.auto="1"),t.addedOpen=r}if(i){if(_.lastKey!=="off"&&(ih(),_.lastKey="off",_.follow)){let v=Math.min(t.eCount-1,Math.max(0,t.t2e(e))),C=t.eSec[v];(C!==_.sec||!Wo(C))&&(_.turning=!0,_.wantPage=0,zi(C,t.eIdx[v]/Math.max(1,t.secCount[C])).finally(()=>setTimeout(()=>_.turning=!1,150)))}return}let s=Math.min(t.eCount-1,Math.max(0,t.t2e(e))),a=t.eSec[s],l=t.eIdx[s],h=a+":"+l;if(h===_.lastKey&&kr(Wo(a)))return;!_.follow&&Date.now()-_.userNavAt>12e3&&_.playing&&ti(!0);let c=Wo(a);if(!c||a!==_.sec){ih(),_.follow&&(_.lastKey="",_.turning=!0,_.wantPage=0,zi(a,l/Math.max(1,t.secCount[a])).finally(()=>setTimeout(()=>_.turning=!1,150)));return}let d=Oi(c.document);if(!d.length)return;let u=d[Math.min(l,d.length-1)],m=c.document.createRange();try{m.setStart(u.node,u.start),m.setEnd(u.node,u.end)}catch{return}if(_.lastKey=h,Go(c,"absplus-ra",m,_.theme.highlight),!_.follow)return;let g=m.getBoundingClientRect(),b=c.innerWidth||1,S=c.innerHeight||1,y=c.document.scrollingElement||c.document.documentElement;if(_.settings.flow==="scrolled"){if(g.top>=S*.08&&g.bottom<=S*.82)return;try{c.scrollBy({top:g.top-S*.3,behavior:_.theme.eink?"auto":"smooth"})}catch{y.scrollTop+=g.top-S*.3}return}if(g.left>=-2&&g.right<=b+2&&g.top>=-2&&g.bottom<=S+2)return;let w=g.left>=b-2&&g.left<b*2+2;_.turning=!0;let R=()=>setTimeout(()=>_.turning=!1,120);if(w&&!_.book.rtl)ei(1,!0).finally(R);else{_.wantPage=0;let v=Math.max(1,y.scrollWidth),C=(y.scrollLeft+g.left)/v;zi(a,C).finally(R)}}function Su(){try{let n=window.frameElement;if(n&&n.getClientRects().length===0)return!0}catch{}return(window.innerWidth||0)<50||(window.innerHeight||0)<50}function ch(){let n=_.settings;return new Ut({backgroundColor:_.theme.bg,textColor:_.theme.fg,linkColor:_.theme.fg,fontSize:(n.fontScale||100)/100,lineHeight:(n.lineSpacing||140)/100,scroll:n.flow==="scrolled",hyphens:n.hyphenate!==!1,textAlign:n.justify===!1?"start":"justify",pageGutter:_.theme.gutter||20,fontWeight:_.theme.weight||null,columnCount:null,selectionBackgroundColor:_.theme.highlight})}async function yu(n,t){await dh();let e=t||{};_.settings=e.settings||{},e.theme&&(_.theme={..._.theme,...e.theme}),document.documentElement.style.background=_.theme.bg,document.body.style.background=_.theme.bg;let i=new Uint8Array(await n.arrayBuffer());_.zip=new wr(i),_.book=lu(_.zip);let o=_.book.positions.map(c=>G.deserialize(c)),r;if(e.start&&typeof e.start.section=="number"&&_.book.spine[e.start.section]){let c=_.book.publication.readingOrder.items[e.start.section];r=G.deserialize({href:c.href,type:c.type||"application/xhtml+xml",locations:{progression:e.start.progression||0}})}let s=document.getElementById("book");s.innerHTML="";let a=()=>{},l={frameLoaded:c=>{let d=hu(c);d<0||(_.frames.set(d,c),lh(c),cu(c,d),_.lastKey="",hh())},positionChanged:c=>{let d=rh(c.href);if(d>=0&&(_.sec=d),_.progression=c.locations&&c.locations.progression||0,Ql(),_.onNextPosition){let u=_.onNextPosition;_.onNextPosition=null,u()}},viewportChanged:a,timelineItemChanged:a,tap:()=>!0,click:()=>!0,zoom:a,miscPointer:a,scroll:a,customEvent:a,handleLocator:c=>{let d=c&&c.href?String(c.href):"";return/^https?:/i.test(d)&&!d.startsWith(Bo)?!1:(Ti(),!0)},textSelected:a,contentProtection:a,contextMenu:a,peripheral:a};_.nav=new xi(s,_.book.publication,l,o,r,{preferences:ch(),defaults:{}});let h=new Promise(c=>_.onNextPosition=c);_.nav.load().catch(c=>ot("error",{message:String(c&&c.message||c)})),await Promise.race([h,new Promise(c=>setTimeout(c,15e3))]),ot("ready",{title:_.book.title,total:_.book.positions.length,toc:nh(),rtl:_.book.rtl,fixed:_.book.fixed}),Ql()}async function dh(){if(_.aligning=null,_.nav)try{await _.nav.destroy()}catch{}if(_.nav=null,_.zip)for(let n of _.zip.blobs.values())URL.revokeObjectURL(n);_.zip=null,_.book=null,_.ra=null,_.frames=new Map,_.lastKey=""}window.ReadiumAPI={open:yu,close:dh,setTranscript:(n,t)=>mu(n,t),setTime:fu,setPlaying(n){_.playing=!!n,n&&!_.follow&&Date.now()-_.userNavAt>3e3&&ti(!0)},setReading(n){_.reading=!!n,Fr(),_.reading?ti(!1):(_.userNavAt=Date.now(),_.lastKey="")},clearLookup:Fr,timeHere(){if(!_.ra)return null;let n=Wo(_.sec);if(!n)return null;let t=Oi(n.document),e=n.innerWidth||1,i=n.innerHeight||1;for(let o of t)try{let r=n.document.createRange();r.setStart(o.node,o.start),r.setEnd(o.node,o.end);let s=r.getBoundingClientRect();if(s.width&&s.left>=-2&&s.left<e&&s.top>=-2&&s.top<i)return Pr(n.document,_.sec,o)}catch{}return null},async search(n){let t=_.book,e=String(n||"").trim();if(!t||e.length<2)return[];let i=e.toLowerCase(),o=[];for(let s=0;s<t.spine.length&&o.length<300;s++){let a="";try{let c=jo(_.zip.text(t.spine[s].item.path)||"",_.zip.type(t.spine[s].item.path));a=((c.body||c.documentElement).textContent||"").replace(/\s+/g," ")}catch{continue}let l=a.toLowerCase(),h=l.indexOf(i);for(;h>=0&&o.length<300;){let c=a.length?h/a.length:0,d=t.sectionFirstPosition[s],u=s+1<t.sectionFirstPosition.length?t.sectionFirstPosition[s+1]:t.positions.length+1,m=Math.min(u-1,d+Math.floor(c*(u-d)));o.push({section:s,progression:c,page:m,pre:a.slice(Math.max(0,h-40),h),match:a.slice(h,h+e.length),post:a.slice(h+e.length,h+e.length+60)}),h=l.indexOf(i,h+i.length)}s%8===7&&await new Promise(c=>setTimeout(c,0))}let r=_.sec;return o.forEach(s=>{_.sec=s.section,s.chapter=sh()}),_.sec=r,o},async goToResult(n){n&&(Ti(),_.wantPage=n.page,await zi(n.section,n.progression))},follow(){_.userNavAt=0,ti(!0)},next:()=>ei(1),prev:()=>ei(-1),async goToPage(n){let t=_.book;if(!t)return;Ti();let e=Math.max(1,Math.min(t.positions.length,Math.round(n)));_.wantPage=e;let i=0;for(let s=0;s<t.sectionFirstPosition.length;s++)t.sectionFirstPosition[s]<=e&&(i=s);let o=t.sectionFirstPosition[i],r=i+1<t.sectionFirstPosition.length?t.sectionFirstPosition[i+1]:t.positions.length+1;await zi(i,(e-o+.5)/Math.max(1,r-o))},async goToHref(n){if(!_.nav||!n)return;Ti();let t=n.split("#")[0],e=_.book.spine.findIndex(s=>s.item.path===t),i=e>=0?_.book.publication.readingOrder.items[e]:null;if(!i)return;let o=n.includes("#")?n.split("#")[1]:"",r=at.deserialize({href:i.href+(o?"#"+o:""),type:i.type||"application/xhtml+xml"});await new Promise(s=>_.nav.goLink(r,!1,s))},async setTheme(n,t){n&&(_.theme={..._.theme,...n}),t&&(_.settings={..._.settings,...t}),document.documentElement.style.background=_.theme.bg,document.body.style.background=_.theme.bg;for(let e of _.frames.values())try{lh(e)}catch{}_.nav&&await _.nav.submitPreferences(ch()).catch(()=>{}),_.lastKey=""},location:()=>({section:_.sec,progression:_.progression,...xr(),page:_.wantPage||xr().page}),toc:()=>_.book?nh():[]};ot("loaded",{});})();
