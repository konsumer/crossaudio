import{r as e}from"./___vite-browser-external_commonjs-proxy.2a84a75e.js";import{f as t}from"./vendor.919e57b3.js";var n={exports:{}},r={exports:{}},s=1e3,o=60*s,i=60*o,a=24*i,l=7*a,c=365.25*a,u=function(e,t){t=t||{};var n=typeof e;if("string"===n&&e.length>0)return function(e){if((e=String(e)).length>100)return;var t=/^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(e);if(!t)return;var n=parseFloat(t[1]);switch((t[2]||"ms").toLowerCase()){case"years":case"year":case"yrs":case"yr":case"y":return n*c;case"weeks":case"week":case"w":return n*l;case"days":case"day":case"d":return n*a;case"hours":case"hour":case"hrs":case"hr":case"h":return n*i;case"minutes":case"minute":case"mins":case"min":case"m":return n*o;case"seconds":case"second":case"secs":case"sec":case"s":return n*s;case"milliseconds":case"millisecond":case"msecs":case"msec":case"ms":return n;default:return}}(e);if("number"===n&&isFinite(e))return t.long?function(e){var t=Math.abs(e);if(t>=a)return d(e,t,a,"day");if(t>=i)return d(e,t,i,"hour");if(t>=o)return d(e,t,o,"minute");if(t>=s)return d(e,t,s,"second");return e+" ms"}(e):function(e){var t=Math.abs(e);if(t>=a)return Math.round(e/a)+"d";if(t>=i)return Math.round(e/i)+"h";if(t>=o)return Math.round(e/o)+"m";if(t>=s)return Math.round(e/s)+"s";return e+"ms"}(e);throw new Error("val is not a non-empty string or a valid number. val="+JSON.stringify(e))};function d(e,t,n,r){var s=t>=1.5*n;return Math.round(e/n)+" "+r+(s?"s":"")}var h=function(e){function t(e){let r,s,o,i=null;function a(...e){if(!a.enabled)return;const n=a,s=Number(new Date),o=s-(r||s);n.diff=o,n.prev=r,n.curr=s,r=s,e[0]=t.coerce(e[0]),"string"!=typeof e[0]&&e.unshift("%O");let i=0;e[0]=e[0].replace(/%([a-zA-Z%])/g,((r,s)=>{if("%%"===r)return"%";i++;const o=t.formatters[s];if("function"==typeof o){const t=e[i];r=o.call(n,t),e.splice(i,1),i--}return r})),t.formatArgs.call(n,e);(n.log||t.log).apply(n,e)}return a.namespace=e,a.useColors=t.useColors(),a.color=t.selectColor(e),a.extend=n,a.destroy=t.destroy,Object.defineProperty(a,"enabled",{enumerable:!0,configurable:!1,get:()=>null!==i?i:(s!==t.namespaces&&(s=t.namespaces,o=t.enabled(e)),o),set:e=>{i=e}}),"function"==typeof t.init&&t.init(a),a}function n(e,n){const r=t(this.namespace+(void 0===n?":":n)+e);return r.log=this.log,r}function r(e){return e.toString().substring(2,e.toString().length-2).replace(/\.\*\?$/,"*")}return t.debug=t,t.default=t,t.coerce=function(e){if(e instanceof Error)return e.stack||e.message;return e},t.disable=function(){const e=[...t.names.map(r),...t.skips.map(r).map((e=>"-"+e))].join(",");return t.enable(""),e},t.enable=function(e){let n;t.save(e),t.namespaces=e,t.names=[],t.skips=[];const r=("string"==typeof e?e:"").split(/[\s,]+/),s=r.length;for(n=0;n<s;n++)r[n]&&("-"===(e=r[n].replace(/\*/g,".*?"))[0]?t.skips.push(new RegExp("^"+e.substr(1)+"$")):t.names.push(new RegExp("^"+e+"$")))},t.enabled=function(e){if("*"===e[e.length-1])return!0;let n,r;for(n=0,r=t.skips.length;n<r;n++)if(t.skips[n].test(e))return!1;for(n=0,r=t.names.length;n<r;n++)if(t.names[n].test(e))return!0;return!1},t.humanize=u,t.destroy=function(){console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.")},Object.keys(e).forEach((n=>{t[n]=e[n]})),t.names=[],t.skips=[],t.formatters={},t.selectColor=function(e){let n=0;for(let t=0;t<e.length;t++)n=(n<<5)-n+e.charCodeAt(t),n|=0;return t.colors[Math.abs(n)%t.colors.length]},t.enable(t.load()),t};!function(e,t){t.formatArgs=function(t){if(t[0]=(this.useColors?"%c":"")+this.namespace+(this.useColors?" %c":" ")+t[0]+(this.useColors?"%c ":" ")+"+"+e.exports.humanize(this.diff),!this.useColors)return;const n="color: "+this.color;t.splice(1,0,n,"color: inherit");let r=0,s=0;t[0].replace(/%[a-zA-Z%]/g,(e=>{"%%"!==e&&(r++,"%c"===e&&(s=r))})),t.splice(s,0,n)},t.save=function(e){try{e?t.storage.setItem("debug",e):t.storage.removeItem("debug")}catch(n){}},t.load=function(){let e;try{e=t.storage.getItem("debug")}catch(n){}!e&&"undefined"!=typeof process&&"env"in process&&(e={}.DEBUG);return e},t.useColors=function(){if("undefined"!=typeof window&&window.process&&("renderer"===window.process.type||window.process.__nwjs))return!0;if("undefined"!=typeof navigator&&navigator.userAgent&&navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))return!1;return"undefined"!=typeof document&&document.documentElement&&document.documentElement.style&&document.documentElement.style.WebkitAppearance||"undefined"!=typeof window&&window.console&&(window.console.firebug||window.console.exception&&window.console.table)||"undefined"!=typeof navigator&&navigator.userAgent&&navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)&&parseInt(RegExp.$1,10)>=31||"undefined"!=typeof navigator&&navigator.userAgent&&navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/)},t.storage=function(){try{return localStorage}catch(e){}}(),t.destroy=(()=>{let e=!1;return()=>{e||(e=!0,console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."))}})(),t.colors=["#0000CC","#0000FF","#0033CC","#0033FF","#0066CC","#0066FF","#0099CC","#0099FF","#00CC00","#00CC33","#00CC66","#00CC99","#00CCCC","#00CCFF","#3300CC","#3300FF","#3333CC","#3333FF","#3366CC","#3366FF","#3399CC","#3399FF","#33CC00","#33CC33","#33CC66","#33CC99","#33CCCC","#33CCFF","#6600CC","#6600FF","#6633CC","#6633FF","#66CC00","#66CC33","#9900CC","#9900FF","#9933CC","#9933FF","#99CC00","#99CC33","#CC0000","#CC0033","#CC0066","#CC0099","#CC00CC","#CC00FF","#CC3300","#CC3333","#CC3366","#CC3399","#CC33CC","#CC33FF","#CC6600","#CC6633","#CC9900","#CC9933","#CCCC00","#CCCC33","#FF0000","#FF0033","#FF0066","#FF0099","#FF00CC","#FF00FF","#FF3300","#FF3333","#FF3366","#FF3399","#FF33CC","#FF33FF","#FF6600","#FF6633","#FF9900","#FF9933","#FFCC00","#FFCC33"],t.log=console.debug||console.log||(()=>{}),e.exports=h(t);const{formatters:n}=e.exports;n.j=function(e){try{return JSON.stringify(e)}catch(t){return"[UnexpectedJSONParseError]: "+t.message}}}(r,r.exports);var p,f,m,g,C,b,_,F,y,w={exports:{}},v=e.sep||"/",E=function(e){if("string"!=typeof e||e.length<=7||"file://"!=e.substring(0,7))throw new TypeError("must pass in a file:// URI to convert to a file path");var t=decodeURI(e.substring(7)),n=t.indexOf("/"),r=t.substring(0,n),s=t.substring(n+1);"localhost"==r&&(r="");r&&(r=v+v+r);s=s.replace(/^(.+)\|/,"$1:"),"\\"==v&&(s=s.replace(/\//g,"\\"));/^.+\:/.test(s)||(s=v+s);return r+s};p=w,f=w.exports,m=e,C=E,b=(g=e).join,_=g.dirname,F=m.accessSync&&function(e){try{m.accessSync(e)}catch(t){return!1}return!0}||m.existsSync||g.existsSync,y={arrow:" → ",compiled:"compiled",platform:process.platform,arch:process.arch,nodePreGyp:"node-v"+process.versions.modules+"-"+process.platform+"-"+process.arch,version:process.versions.node,bindings:"bindings.node",try:[["module_root","build","bindings"],["module_root","build","Debug","bindings"],["module_root","build","Release","bindings"],["module_root","out","Debug","bindings"],["module_root","Debug","bindings"],["module_root","out","Release","bindings"],["module_root","Release","bindings"],["module_root","build","default","bindings"],["module_root","compiled","version","platform","arch","bindings"],["module_root","addon-build","release","install-root","bindings"],["module_root","addon-build","debug","install-root","bindings"],["module_root","addon-build","default","install-root","bindings"],["module_root","lib","binding","nodePreGyp","bindings"]]},p.exports=f=function(e){"string"==typeof e?e={bindings:e}:e||(e={}),Object.keys(y).map((function(t){t in e||(e[t]=y[t])})),e.module_root||(e.module_root=f.getRoot(f.getFileName())),".node"!=g.extname(e.bindings)&&(e.bindings+=".node");for(var n,r,s,o="function"==typeof __webpack_require__?__non_webpack_require__:t,i=[],a=0,l=e.try.length;a<l;a++){n=b.apply(null,e.try[a].map((function(t){return e[t]||t}))),i.push(n);try{return r=e.path?o.resolve(n):o(n),e.path||(r.path=n),r}catch(c){if("MODULE_NOT_FOUND"!==c.code&&"QUALIFIED_PATH_RESOLUTION_FAILED"!==c.code&&!/not find/i.test(c.message))throw c}}throw(s=new Error("Could not locate the bindings file. Tried:\n"+i.map((function(t){return e.arrow+t})).join("\n"))).tries=i,s},f.getFileName=function(e){var t,n=Error.prepareStackTrace,r=Error.stackTraceLimit,s={};return Error.stackTraceLimit=10,Error.prepareStackTrace=function(n,r){for(var s=0,o=r.length;s<o;s++)if((t=r[s].getFileName())!==__filename){if(!e)return;if(t!==e)return}},Error.captureStackTrace(s),Error.prepareStackTrace=n,Error.stackTraceLimit=r,0===t.indexOf("file://")&&(t=C(t)),t},f.getRoot=function(e){for(var t,n=_(e);;){if("."===n&&(n=process.cwd()),F(b(n,"package.json"))||F(b(n,"node_modules")))return n;if(t===n)throw new Error('Could not find module root given file: "'+e+'". Do you have a `package.json` file? ');t=n,n=b(n,"..")}},function(t,n){const s=e,o=r.exports("speaker"),i=w.exports("binding"),{Writable:a}=e,l=s.endianness();class c extends a{constructor(e){e||(e={}),null==e.lowWaterMark&&(e.lowWaterMark=0),null==e.highWaterMark&&(e.highWaterMark=0),super(e),this.samplesPerFrame=1024,this.audio_handle=null,this._closed=!1,this._format(e),this._format=this._format.bind(this),this.on("finish",this._flush),this.on("pipe",this._pipe),this.on("unpipe",this._unpipe)}_open(){if(o("open()"),this.audio_handle)throw new Error("_open() called more than once!");if(null==this.channels&&(o("setting default %o: %o","channels",2),this.channels=2),null==this.bitDepth){const e=this.float?32:16;o("setting default %o: %o","bitDepth",e),this.bitDepth=e}null==this.sampleRate&&(o("setting default %o: %o","sampleRate",44100),this.sampleRate=44100),null==this.signed&&(o("setting default %o: %o","signed",8!==this.bitDepth),this.signed=8!==this.bitDepth),null==this.device&&(o("setting default %o: %o","device",null),this.device=null);const e=c.getFormat(this);if(null==e)throw new Error("invalid PCM format specified");if(!c.isSupported(e))throw new Error(`specified PCM format is not supported by "${i.name}" backend`);return this.blockAlign=this.bitDepth/8*this.channels,this.audio_handle=i.open(this.channels,this.sampleRate,e,this.device),this.emit("open"),this.audio_handle}_format(e){o("format(object keys = %o)",Object.keys(e)),null!=e.channels&&(o("setting %o: %o","channels",e.channels),this.channels=e.channels),null!=e.bitDepth&&(o("setting %o: %o","bitDepth",e.bitDepth),this.bitDepth=e.bitDepth),null!=e.sampleRate&&(o("setting %o: %o","sampleRate",e.sampleRate),this.sampleRate=e.sampleRate),null!=e.float&&(o("setting %o: %o","float",e.float),this.float=e.float),null!=e.signed&&(o("setting %o: %o","signed",e.signed),this.signed=e.signed),null!=e.samplesPerFrame&&(o("setting %o: %o","samplesPerFrame",e.samplesPerFrame),this.samplesPerFrame=e.samplesPerFrame),null!=e.device&&(o("setting %o: %o","device",e.device),this.device=e.device),null==e.endianness||l===e.endianness?this.endianness=l:this.emit("error",new Error(`only native endianness ("${l}") is supported, got "${e.endianness}"`))}_write(e,t,n){if(o("_write() (%o bytes)",e.length),this._closed)return n(new Error("write() call after close() call"));let r,s=e,a=this.audio_handle;if(!a)try{a=this._open()}catch(h){return n(h)}const l=this.blockAlign*this.samplesPerFrame,c=()=>{if(this._closed)return o("aborting remainder of write() call (%o bytes), since speaker is `_closed`",s.length),n();if(r=s,r.length>l){const e=r;r=e.slice(0,l),s=e.slice(l)}else s=null;o("writing %o byte chunk",r.length),i.write(a,r).then(d,u)},u=e=>{this.emit("error",e)},d=e=>{o("wrote %o bytes",e),e!==r.length?n(new Error(`write() failed: ${e}`)):s?(o("still %o bytes left in this chunk",s.length),c()):(o("done with this chunk"),n())};c()}_pipe(e){o("_pipe()"),this._format(e),e.once("format",this._format)}_unpipe(e){o("_unpipe()"),e.removeListener("format",this._format)}_flush(){o("_flush()"),this.emit("flush"),this.close(!1)}close(e){if(o("close(%o)",e),this._closed)return o("already closed...");this.audio_handle?(!1!==e&&(o("invoking flush() native binding"),i.flush(this.audio_handle)),o("invoking close() native binding"),i.close(this.audio_handle),this.audio_handle=null):o("not invoking flush() or close() bindings since no `audio_handle`"),this._closed=!0,this.emit("close")}}c.api_version=i.api_version,c.description=i.description,c.module_name=i.name,c.getFormat=function(e){return 32===Number(e.bitDepth)&&e.float&&e.signed?i.MPG123_ENC_FLOAT_32:64===Number(e.bitDepth)&&e.float&&e.signed?i.MPG123_ENC_FLOAT_64:8===Number(e.bitDepth)&&e.signed?i.MPG123_ENC_SIGNED_8:8!==Number(e.bitDepth)||e.signed?16===Number(e.bitDepth)&&e.signed?i.MPG123_ENC_SIGNED_16:16!==Number(e.bitDepth)||e.signed?24===Number(e.bitDepth)&&e.signed?i.MPG123_ENC_SIGNED_24:24!==Number(e.bitDepth)||e.signed?32===Number(e.bitDepth)&&e.signed?i.MPG123_ENC_SIGNED_32:32!==Number(e.bitDepth)||e.signed?null:i.MPG123_ENC_UNSIGNED_32:i.MPG123_ENC_UNSIGNED_24:i.MPG123_ENC_UNSIGNED_16:i.MPG123_ENC_UNSIGNED_8},c.isSupported=function(e){return"number"!=typeof e&&(e=c.getFormat(e)),(i.formats&e)===e},t.exports=c}(n);var k=n.exports,N=Object.freeze(Object.assign(Object.create(null),n.exports,{[Symbol.toStringTag]:"Module",default:k}));export{N as i};
