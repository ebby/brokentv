var g=void 0,i=!0,j=null,k=!1;function aa(a){return function(b){this[a]=b}}function ba(a){return function(){return this[a]}}var n,ca=ca||{},p=this;function da(a){for(var a=a.split("."),b=p,c;c=a.shift();)if(b[c]!=j)b=b[c];else return j;return b}function ea(){}
function t(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b}function fa(a){var b=t(a);return"array"==b||"object"==b&&"number"==typeof a.length}function u(a){return"string"==typeof a}function v(a){return a[ga]||(a[ga]=++ha)}var ga="closure_uid_"+Math.floor(2147483648*Math.random()).toString(36),ha=0;function ia(a,b,c){return a.call.apply(a.bind,arguments)}
function ja(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}}function w(a,b,c){w=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?ia:ja;return w.apply(j,arguments)}
function la(a,b){var c=Array.prototype.slice.call(arguments,1);return function(){var b=Array.prototype.slice.call(arguments);b.unshift.apply(b,c);return a.apply(this,b)}}var ma=Date.now||function(){return+new Date};function na(a){var b={},c;for(c in b)var d=(""+b[c]).replace(/\$/g,"$$$$"),a=a.replace(RegExp("\\{\\$"+c+"\\}","gi"),d);return a}function x(a,b){function c(){}c.prototype=b.prototype;a.k=b.prototype;a.prototype=new c};function oa(a,b){for(var c=1;c<arguments.length;c++)var d=String(arguments[c]).replace(/\$/g,"$$$$"),a=a.replace(/\%s/,d);return a}function pa(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")}function qa(a){if(!ra.test(a))return a;-1!=a.indexOf("&")&&(a=a.replace(sa,"&amp;"));-1!=a.indexOf("<")&&(a=a.replace(ta,"&lt;"));-1!=a.indexOf(">")&&(a=a.replace(ua,"&gt;"));-1!=a.indexOf('"')&&(a=a.replace(va,"&quot;"));return a}var sa=/&/g,ta=/</g,ua=/>/g,va=/\"/g,ra=/[&<>\"]/;
function y(a){var a=String(a),b=a.indexOf(".");-1==b&&(b=a.length);b=Math.max(0,2-b);return Array(b+1).join("0")+a};var z=Array.prototype,wa=z.indexOf?function(a,b,c){return z.indexOf.call(a,b,c)}:function(a,b,c){c=c==j?0:0>c?Math.max(0,a.length+c):c;if(u(a))return!u(b)||1!=b.length?-1:a.indexOf(b,c);for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1},A=z.forEach?function(a,b,c){z.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,f=u(a)?a.split(""):a,e=0;e<d;e++)e in f&&b.call(c,f[e],e,a)},xa=z.filter?function(a,b,c){return z.filter.call(a,b,c)}:function(a,b,c){for(var d=a.length,f=[],e=0,h=u(a)?a.split(""):
a,l=0;l<d;l++)if(l in h){var m=h[l];b.call(c,m,l,a)&&(f[e++]=m)}return f},ya=z.map?function(a,b,c){return z.map.call(a,b,c)}:function(a,b,c){for(var d=a.length,f=Array(d),e=u(a)?a.split(""):a,h=0;h<d;h++)h in e&&(f[h]=b.call(c,e[h],h,a));return f};function B(a,b){return 0<=wa(a,b)}function za(a,b){var c=wa(a,b);0<=c&&z.splice.call(a,c,1)}function Aa(a,b,c){return 2>=arguments.length?z.slice.call(a,b):z.slice.call(a,b,c)};var C,Ba,Ca,Da;function Ea(){return p.navigator?p.navigator.userAgent:j}Da=Ca=Ba=C=k;var Fa;if(Fa=Ea()){var Ga=p.navigator;C=0==Fa.indexOf("Opera");Ba=!C&&-1!=Fa.indexOf("MSIE");Ca=!C&&-1!=Fa.indexOf("WebKit");Da=!C&&!Ca&&"Gecko"==Ga.product}var Ha=C,E=Ba,F=Da,Ia=Ca,Ja=p.navigator,Ka=-1!=(Ja&&Ja.platform||"").indexOf("Mac"),La;
a:{var Ma="",Na;if(Ha&&p.opera)var Oa=p.opera.version,Ma="function"==typeof Oa?Oa():Oa;else if(F?Na=/rv\:([^\);]+)(\)|;)/:E?Na=/MSIE\s+([^\);]+)(\)|;)/:Ia&&(Na=/WebKit\/(\S+)/),Na)var Pa=Na.exec(Ea()),Ma=Pa?Pa[1]:"";if(E){var Qa,Ra=p.document;Qa=Ra?Ra.documentMode:g;if(Qa>parseFloat(Ma)){La=String(Qa);break a}}La=Ma}var Sa={};
function G(a){var b;if(!(b=Sa[a])){b=0;for(var c=pa(String(La)).split("."),d=pa(String(a)).split("."),f=Math.max(c.length,d.length),e=0;0==b&&e<f;e++){var h=c[e]||"",l=d[e]||"",m=RegExp("(\\d*)(\\D*)","g"),q=RegExp("(\\d*)(\\D*)","g");do{var r=m.exec(h)||["","",""],s=q.exec(l)||["","",""];if(0==r[0].length&&0==s[0].length)break;b=((0==r[1].length?0:parseInt(r[1],10))<(0==s[1].length?0:parseInt(s[1],10))?-1:(0==r[1].length?0:parseInt(r[1],10))>(0==s[1].length?0:parseInt(s[1],10))?1:0)||((0==r[2].length)<
(0==s[2].length)?-1:(0==r[2].length)>(0==s[2].length)?1:0)||(r[2]<s[2]?-1:r[2]>s[2]?1:0)}while(0==b)}b=Sa[a]=0<=b}return b}var Ta={};function Ua(){return Ta[9]||(Ta[9]=E&&!!document.documentMode&&9<=document.documentMode)};var Va;!E||Ua();var Wa=!F&&!E||E&&Ua()||F&&G("1.9.1");E&&G("9");function H(a){a=a.className;return u(a)&&a.match(/\S+/g)||[]}function I(a,b){for(var c=H(a),d=Aa(arguments,1),f=c,e=0;e<d.length;e++)B(f,d[e])||f.push(d[e]);a.className=c.join(" ")}function Xa(a,b){var c=H(a),d=Aa(arguments,1),c=xa(c,function(a){return!B(d,a)});a.className=c.join(" ")};function Ya(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b}function Za(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b}var $a="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function ab(a,b){for(var c,d,f=1;f<arguments.length;f++){d=arguments[f];for(c in d)a[c]=d[c];for(var e=0;e<$a.length;e++)c=$a[e],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}};function bb(a){return a?new J(9==a.nodeType?a:a.ownerDocument||a.document):Va||(Va=new J)}function cb(a){return u(a)?document.getElementById(a):a}function db(a,b){var c=b||document;c.querySelectorAll&&c.querySelector?c=c.querySelector("."+a):(c=b||document,c=(c.querySelectorAll&&c.querySelector?c.querySelectorAll("."+a):c.getElementsByClassName?c.getElementsByClassName(a):eb(a,b))[0]);return c||j}
function eb(a,b){var c,d,f,e;c=document;c=b||c;if(c.querySelectorAll&&c.querySelector&&a)return c.querySelectorAll(""+(a?"."+a:""));if(a&&c.getElementsByClassName){var h=c.getElementsByClassName(a);return h}h=c.getElementsByTagName("*");if(a){e={};for(d=f=0;c=h[d];d++){var l=c.className;"function"==typeof l.split&&B(l.split(/\s+/),a)&&(e[f++]=c)}e.length=f;return e}return h}function fb(a){return Wa&&a.children!=g?a.children:xa(a.childNodes,function(a){return 1==a.nodeType})}
function gb(a,b){if(!b)return j;var c;a:{c=a;for(var d=0;c;){if(!b||B(H(c),b))break a;c=c.parentNode;d++}c=j}return c}function J(a){this.ba=a||p.document||document}J.prototype.ea=function(a){return u(a)?this.ba.getElementById(a):a};J.prototype.createElement=function(a){return this.ba.createElement(a)};J.prototype.appendChild=function(a,b){a.appendChild(b)};J.prototype.qa=fb;E&&G(8);var hb={};function ib(a,b){var c;a:if(c=(new J(g)||bb()).createElement("DIV"),c.innerHTML=a(b||hb,g,g),1==c.childNodes.length){var d=c.firstChild;if(1==d.nodeType){c=d;break a}}return c}function K(a){return"object"===typeof a&&a&&0===a.yb?a.content:String(a).replace(jb,kb)}
var lb={"\x00":"&#0;",'"':"&quot;","&":"&amp;","'":"&#39;","<":"&lt;",">":"&gt;","\t":"&#9;","\n":"&#10;","\x0B":"&#11;","\f":"&#12;","\r":"&#13;"," ":"&#32;","-":"&#45;","/":"&#47;","=":"&#61;","`":"&#96;","\u0085":"&#133;","\u00a0":"&#160;","\u2028":"&#8232;","\u2029":"&#8233;"};function kb(a){return lb[a]}var jb=/[\x00\x22\x26\x27\x3c\x3e]/g;function mb(){return'<div class="users"><div class="header"><div class="pic">USER</div><div class="access">ACCESS LEVEL</div><div class="location" href="#">LOCATION</div><div class="last-login">LAST LOGIN</div><div class="session-count">SESSION COUNT</div><div class="ave-session">AVE SESSION</div><div class="demo">DEMO</div></div><div class="user-list"></div>'}
function nb(a){return'<div class="user" id="'+K(a.n.id)+'"><div class="pic"><img src="'+K(a.n.Ra)+'"></div><a class="name" target="_blank" href="'+K(a.n.url)+'">'+K(a.n.name)+'</a><div class="controls access"><div class="button dark 2'+(2==a.n.aa?" selected":"")+'">ADMIN</div><div class="button dark 1'+(1==a.n.aa?" selected":"")+'">USER</div><div class="button dark 0'+(0==a.n.aa?" selected":"")+'">NONE</div></div><a class="location" href="#">'+K(a.n.location)+'</a><div class="last-login">'+K(a.v)+
'</div><div class="session-count">'+K(a.n.Va)+'</div><div class="ave-session">'+K(a.n.Ga)+'</div><div class="button dark demo'+(a.n.Ha?" selected":"")+'">DEMO</div></div>'};var ob={gb:["BC","AD"],fb:["Before Christ","Anno Domini"],ib:"JFMAMJJASOND".split(""),pb:"JFMAMJJASOND".split(""),hb:"January February March April May June July August September October November December".split(" "),ob:"January February March April May June July August September October November December".split(" "),lb:"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" "),rb:"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" "),vb:"Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),
tb:"Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" "),nb:"Sun Mon Tue Wed Thu Fri Sat".split(" "),sb:"Sun Mon Tue Wed Thu Fri Sat".split(" "),jb:"SMTWTFS".split(""),qb:"SMTWTFS".split(""),mb:["Q1","Q2","Q3","Q4"],kb:["1st quarter","2nd quarter","3rd quarter","4th quarter"],cb:["AM","PM"],eb:["EEEE, MMMM d, y","MMMM d, y","MMM d, y","M/d/yy"],ub:["h:mm:ss a zzzz","h:mm:ss a z","h:mm:ss a","h:mm a"],Da:6,wb:[5,6],Ea:5};var pb=/^(\d{4})(?:(?:-?(\d{2})(?:-?(\d{2}))?)|(?:-?(\d{3}))|(?:-?W(\d{2})(?:-?([1-7]))?))?$/,qb=/^(\d{2})(?::?(\d{2})(?::?(\d{2})(\.\d+)?)?)?$/,rb=/Z|(?:([-+])(\d{2})(?::?(\d{2}))?)$/;function L(a,b,c,d,f,e){u(a)?(this.o=a==sb?b:0,this.m=a==tb?b:0,this.l=a==ub?b:0,this.g=a==vb?b:0,this.h=a==wb?b:0,this.j=a==xb?b:0):(this.o=a||0,this.m=b||0,this.l=c||0,this.g=d||0,this.h=f||0,this.j=e||0)}
L.prototype.N=function(a){var b=Math.min(this.o,this.m,this.l,this.g,this.h,this.j),c=Math.max(this.o,this.m,this.l,this.g,this.h,this.j);if(0>b&&0<c)return j;if(!a&&0==b&&0==c)return"PT0S";c=[];0>b&&c.push("-");c.push("P");(this.o||a)&&c.push(Math.abs(this.o)+"Y");(this.m||a)&&c.push(Math.abs(this.m)+"M");(this.l||a)&&c.push(Math.abs(this.l)+"D");if(this.g||this.h||this.j||a)c.push("T"),(this.g||a)&&c.push(Math.abs(this.g)+"H"),(this.h||a)&&c.push(Math.abs(this.h)+"M"),(this.j||a)&&c.push(Math.abs(this.j)+
"S");return c.join("")};L.prototype.clone=function(){return new L(this.o,this.m,this.l,this.g,this.h,this.j)};var sb="y",tb="m",ub="d",vb="h",wb="n",xb="s";L.prototype.add=function(a){this.o+=a.o;this.m+=a.m;this.l+=a.l;this.g+=a.g;this.h+=a.h;this.j+=a.j};
function yb(a,b,c){"number"==typeof a?(this.a=new Date(a,b||0,c||1),zb(this,c||1)):(b=typeof a,"object"==b&&a!=j||"function"==b?(this.a=new Date(a.getFullYear(),a.getMonth(),a.getDate()),zb(this,a.getDate())):(this.a=new Date(ma()),this.a.setHours(0),this.a.setMinutes(0),this.a.setSeconds(0),this.a.setMilliseconds(0)))}n=yb.prototype;n.R=ob.Da;n.S=ob.Ea;n.clone=function(){var a=new yb(this.a);a.R=this.R;a.S=this.S;return a};n.getFullYear=function(){return this.a.getFullYear()};n.getYear=function(){return this.getFullYear()};
n.getMonth=function(){return this.a.getMonth()};n.getDate=function(){return this.a.getDate()};n.getTime=function(){return this.a.getTime()};n.getDay=function(){return this.a.getDay()};n.getUTCHours=function(){return this.a.getUTCHours()};n.getTimezoneOffset=function(){return this.a.getTimezoneOffset()};function Ab(a){a=a.getTimezoneOffset();if(0==a)a="Z";else var b=Math.abs(a)/60,c=Math.floor(b),b=60*(b-c),a=(0<a?"-":"+")+y(c)+":"+y(b);return a}
n.set=function(a){this.a=new Date(a.getFullYear(),a.getMonth(),a.getDate())};n.setFullYear=function(a){this.a.setFullYear(a)};n.setMonth=function(a){this.a.setMonth(a)};n.setDate=function(a){this.a.setDate(a)};n.setTime=function(a){this.a.setTime(a)};
n.add=function(a){if(a.o||a.m){var b=this.getMonth()+a.m+12*a.o,c=this.getYear()+Math.floor(b/12),b=b%12;0>b&&(b+=12);var d;a:{switch(b){case 1:d=0==c%4&&(0!=c%100||0==c%400)?29:28;break a;case 5:case 8:case 10:case 3:d=30;break a}d=31}d=Math.min(d,this.getDate());this.setDate(1);this.setFullYear(c);this.setMonth(b);this.setDate(d)}a.l&&(a=new Date((new Date(this.getYear(),this.getMonth(),this.getDate(),12)).getTime()+864E5*a.l),this.setDate(1),this.setFullYear(a.getFullYear()),this.setMonth(a.getMonth()),
this.setDate(a.getDate()),zb(this,a.getDate()))};n.N=function(a,b){return[this.getFullYear(),y(this.getMonth()+1),y(this.getDate())].join(a?"-":"")+(b?Ab(this):"")};n.toString=function(){return this.N()};function zb(a,b){a.getDate()!=b&&a.a.setUTCHours(a.a.getUTCHours()+(a.getDate()<b?1:-1))}n.valueOf=function(){return this.a.valueOf()};function Bb(a,b,c,d,f,e,h){this.a="number"==typeof a?new Date(a,b||0,c||1,d||0,f||0,e||0,h||0):new Date(a?a.getTime():ma())}x(Bb,yb);n=Bb.prototype;n.getHours=function(){return this.a.getHours()};
n.getMinutes=function(){return this.a.getMinutes()};n.getSeconds=function(){return this.a.getSeconds()};n.getUTCHours=function(){return this.a.getUTCHours()};n.setHours=function(a){this.a.setHours(a)};n.setMinutes=function(a){this.a.setMinutes(a)};n.setSeconds=function(a){this.a.setSeconds(a)};n.setMilliseconds=function(a){this.a.setMilliseconds(a)};n.setUTCHours=function(a){this.a.setUTCHours(a)};
n.add=function(a){yb.prototype.add.call(this,a);a.g&&this.setHours(this.a.getHours()+a.g);a.h&&this.setMinutes(this.a.getMinutes()+a.h);a.j&&this.setSeconds(this.a.getSeconds()+a.j)};n.N=function(a,b){var c=yb.prototype.N.call(this,a);return a?c+" "+y(this.getHours())+":"+y(this.getMinutes())+":"+y(this.getSeconds())+(b?Ab(this):""):c+"T"+y(this.getHours())+y(this.getMinutes())+y(this.getSeconds())+(b?Ab(this):"")};n.toString=function(){return this.N()};
n.clone=function(){var a=new Bb(this.a);a.R=this.R;a.S=this.S;return a};function M(){0!=Cb&&(this.zb=Error().stack,Db[v(this)]=this)}var Cb=0,Db={};M.prototype.ma=k;M.prototype.A=function(){if(!this.ma&&(this.ma=i,this.f(),0!=Cb)){var a=v(this);delete Db[a]}};M.prototype.f=function(){this.Ia&&Eb.apply(j,this.Ia);if(this.za)for(;this.za.length;)this.za.shift()()};function Eb(a){for(var b=0,c=arguments.length;b<c;++b){var d=arguments[b];fa(d)?Eb.apply(j,d):d&&"function"==typeof d.A&&d.A()}};function Fb(){M.call(this);this.Wa=[];this.Ya={}}x(Fb,M);Fb.prototype.f=function(){Fb.k.f.call(this);delete this.Wa;delete this.Ya;delete this.Cb};function Gb(a){Fb.call(this);this.id=a.id;this.name=a.name;this.url=a.profile_url;this.location=a.location||"";this.Ib=a.welcomed;this.Ha=a.demo;this.Ra=oa("https://graph.facebook.com/%s/picture",this.id);for(this.color=Raphael.getColor();"#00bf85"==this.color||"#00bf2f"==this.color;)this.color=Raphael.getColor();this.aa=a.access_level;this.xb=[];var b;if(a.last_login){var c=a.last_login+"Z";b=new Bb(2E3);var c=pa(c),c=c.split(-1==c.indexOf("T")?" ":"T"),d;var f=c[0].match(pb);if(f){var e=Number(f[2]),
h=Number(f[3]),l=Number(f[4]);d=Number(f[5]);var m=Number(f[6])||1;b.setFullYear(Number(f[1]));l?(b.setDate(1),b.setMonth(0),b.add(new L(ub,l-1))):d?(b.setMonth(0),b.setDate(1),f=b.getDay()||7,b.add(new L(ub,(4>=f?1-f:8-f)+(Number(m)+7*(Number(d)-1))-1))):(e&&(b.setDate(1),b.setMonth(e-1)),h&&b.setDate(h));d=i}else d=k;if(d&&!(d=2>c.length))c=c[1],d=c.match(rb),m=0,d&&("Z"!=d[0]&&(m=60*d[2]+Number(d[3]),m*="-"==d[1]?1:-1),m-=b.getTimezoneOffset(),c=c.substr(0,c.length-d[0].length)),(d=c.match(qb))?
(b.setHours(Number(d[1])),b.setMinutes(Number(d[2])||0),b.setSeconds(Number(d[3])||0),b.setMilliseconds(d[4]?1E3*d[4]:0),0!=m&&b.setTime(b.getTime()+6E4*m),d=i):d=k;b=d?b:j}else b=j;this.v=b;this.Va=a.session_count;this.Ga=a.ave_session?a.ave_session.toFixed(2):j;this.Fb=a.show_guide!=g?a.show_guide:i;this.Gb=a.show_sidebar!=g?a.show_sidebar:i;this.Db=a.post_facebook!=g?a.post_facebook:i;this.Eb=a.post_twitter!=g?a.post_twitter:i}x(Gb,Fb);var Hb;Hb=function(){return j};!E||Ua();var Ib=!E||Ua(),Jb=E&&!G("9");!Ia||G("528");F&&G("1.9b")||E&&G("8")||Ha&&G("9.5")||Ia&&G("528");F&&!G("8")||E&&G("9");function N(a,b){this.type=a;this.currentTarget=this.target=b}n=N.prototype;n.f=function(){};n.A=function(){};n.D=k;n.defaultPrevented=k;n.Y=i;n.preventDefault=function(){this.defaultPrevented=i;this.Y=k};function Kb(a){Kb[" "](a);return a}Kb[" "]=ea;function Lb(a,b){a&&this.init(a,b)}x(Lb,N);n=Lb.prototype;n.target=j;n.relatedTarget=j;n.offsetX=0;n.offsetY=0;n.clientX=0;n.clientY=0;n.screenX=0;n.screenY=0;n.button=0;n.keyCode=0;n.charCode=0;n.ctrlKey=k;n.altKey=k;n.shiftKey=k;n.metaKey=k;n.Sa=k;n.na=j;
n.init=function(a,b){var c=this.type=a.type;N.call(this,c);this.target=a.target||a.srcElement;this.currentTarget=b;var d=a.relatedTarget;if(d){if(F){var f;a:{try{Kb(d.nodeName);f=i;break a}catch(e){}f=k}f||(d=j)}}else"mouseover"==c?d=a.fromElement:"mouseout"==c&&(d=a.toElement);this.relatedTarget=d;this.offsetX=Ia||a.offsetX!==g?a.offsetX:a.layerX;this.offsetY=Ia||a.offsetY!==g?a.offsetY:a.layerY;this.clientX=a.clientX!==g?a.clientX:a.pageX;this.clientY=a.clientY!==g?a.clientY:a.pageY;this.screenX=
a.screenX||0;this.screenY=a.screenY||0;this.button=a.button;this.keyCode=a.keyCode||0;this.charCode=a.charCode||("keypress"==c?a.keyCode:0);this.ctrlKey=a.ctrlKey;this.altKey=a.altKey;this.shiftKey=a.shiftKey;this.metaKey=a.metaKey;this.Sa=Ka?a.metaKey:a.ctrlKey;this.state=a.state;this.na=a;a.defaultPrevented&&this.preventDefault();delete this.D};
n.preventDefault=function(){Lb.k.preventDefault.call(this);var a=this.na;if(a.preventDefault)a.preventDefault();else if(a.returnValue=k,Jb)try{if(a.ctrlKey||112<=a.keyCode&&123>=a.keyCode)a.keyCode=-1}catch(b){}};n.f=function(){};function Mb(){}var Nb=0;n=Mb.prototype;n.key=0;n.F=k;n.ka=k;n.init=function(a,b,c,d,f,e){if("function"==t(a))this.wa=i;else if(a&&a.handleEvent&&"function"==t(a.handleEvent))this.wa=k;else throw Error("Invalid listener argument");this.L=a;this.proxy=b;this.src=c;this.type=d;this.capture=!!f;this.ga=e;this.ka=k;this.key=++Nb;this.F=k};n.handleEvent=function(a){return this.wa?this.L.call(this.ga||this.src,a):this.L.handleEvent.call(this.L,a)};var O={},P={},Q={},R={};
function Ob(a,b,c,d,f){if(b){if("array"==t(b)){for(var e=0;e<b.length;e++)Ob(a,b[e],c,d,f);return j}var d=!!d,h=P;b in h||(h[b]={d:0,i:0});h=h[b];d in h||(h[d]={d:0,i:0},h.d++);var h=h[d],l=v(a),m;h.i++;if(h[l]){m=h[l];for(e=0;e<m.length;e++)if(h=m[e],h.L==c&&h.ga==f){if(h.F)break;return m[e].key}}else m=h[l]=[],h.d++;var q=Pb,r=Ib?function(a){return q.call(r.src,r.key,a)}:function(a){a=q.call(r.src,r.key,a);if(!a)return a},e=r;e.src=a;h=new Mb;h.init(c,e,a,b,d,f);c=h.key;e.key=c;m.push(h);O[c]=h;
Q[l]||(Q[l]=[]);Q[l].push(h);a.addEventListener?(a==p||!a.la)&&a.addEventListener(b,e,d):a.attachEvent(b in R?R[b]:R[b]="on"+b,e);return c}throw Error("Invalid event type");}function Qb(a,b,c,d,f){if("array"==t(b))for(var e=0;e<b.length;e++)Qb(a,b[e],c,d,f);else{d=!!d;a:{e=P;if(b in e&&(e=e[b],d in e&&(e=e[d],a=v(a),e[a]))){a=e[a];break a}a=j}if(a)for(e=0;e<a.length;e++)if(a[e].L==c&&a[e].capture==d&&a[e].ga==f){S(a[e].key);break}}}
function S(a){if(!O[a])return k;var b=O[a];if(b.F)return k;var c=b.src,d=b.type,f=b.proxy,e=b.capture;c.removeEventListener?(c==p||!c.la)&&c.removeEventListener(d,f,e):c.detachEvent&&c.detachEvent(d in R?R[d]:R[d]="on"+d,f);c=v(c);Q[c]&&(f=Q[c],za(f,b),0==f.length&&delete Q[c]);b.F=i;if(b=P[d][e][c])b.ya=i,Rb(d,e,c,b);delete O[a];return i}
function Rb(a,b,c,d){if(!d.V&&d.ya){for(var f=0,e=0;f<d.length;f++)d[f].F?d[f].proxy.src=j:(f!=e&&(d[e]=d[f]),e++);d.length=e;d.ya=k;0==e&&(delete P[a][b][c],P[a][b].d--,0==P[a][b].d&&(delete P[a][b],P[a].d--),0==P[a].d&&delete P[a])}}function Sb(a,b,c,d,f){var e=1,b=v(b);if(a[b]){a.i--;a=a[b];a.V?a.V++:a.V=1;try{for(var h=a.length,l=0;l<h;l++){var m=a[l];m&&!m.F&&(e&=Tb(m,f)!==k)}}finally{a.V--,Rb(c,d,b,a)}}return Boolean(e)}function Tb(a,b){a.ka&&S(a.key);return a.handleEvent(b)}
function Pb(a,b){if(!O[a])return i;var c=O[a],d=c.type,f=P;if(!(d in f))return i;var f=f[d],e,h;if(!Ib){e=b||da("window.event");var l=i in f,m=k in f;if(l){if(0>e.keyCode||e.returnValue!=g)return i;a:{var q=k;if(0==e.keyCode)try{e.keyCode=-1;break a}catch(r){q=i}if(q||e.returnValue==g)e.returnValue=i}}q=new Lb;q.init(e,this);e=i;try{if(l){for(var s=[],ka=q.currentTarget;ka;ka=ka.parentNode)s.push(ka);h=f[i];h.i=h.d;for(var D=s.length-1;!q.D&&0<=D&&h.i;D--)q.currentTarget=s[D],e&=Sb(h,s[D],d,i,q);
if(m){h=f[k];h.i=h.d;for(D=0;!q.D&&D<s.length&&h.i;D++)q.currentTarget=s[D],e&=Sb(h,s[D],d,k,q)}}else e=Tb(c,q)}finally{s&&(s.length=0)}return e}d=new Lb(b,this);return e=Tb(c,d)};function Ub(){M.call(this)}x(Ub,M);n=Ub.prototype;n.la=i;n.W=j;n.ja=aa("W");n.addEventListener=function(a,b,c,d){Ob(this,a,b,c,d)};n.removeEventListener=function(a,b,c,d){Qb(this,a,b,c,d)};
n.dispatchEvent=function(a){var b=a.type||a,c=P;if(b in c){if(u(a))a=new N(a,this);else if(a instanceof N)a.target=a.target||this;else{var d=a,a=new N(b,this);ab(a,d)}var d=1,f,c=c[b],b=i in c,e;if(b){f=[];for(e=this;e;e=e.W)f.push(e);e=c[i];e.i=e.d;for(var h=f.length-1;!a.D&&0<=h&&e.i;h--)a.currentTarget=f[h],d&=Sb(e,f[h],a.type,i,a)&&a.Y!=k}if(k in c)if(e=c[k],e.i=e.d,b)for(h=0;!a.D&&h<f.length&&e.i;h++)a.currentTarget=f[h],d&=Sb(e,f[h],a.type,k,a)&&a.Y!=k;else for(f=this;!a.D&&f&&e.i;f=f.W)a.currentTarget=
f,d&=Sb(e,f,a.type,k,a)&&a.Y!=k;a=Boolean(d)}else a=i;return a};n.f=function(){Ub.k.f.call(this);var a,b=0,c=a==j;a=!!a;if(this==j){var d=function(d){for(var e=d.length-1;0<=e;e--){var f=d[e];if(c||a==f.capture)S(f.key),b++}},f;for(f in Q)d.call(g,Q[f])}else if(d=v(this),Q[d]){d=Q[d];for(f=d.length-1;0<=f;f--){var e=d[f];if(c||a==e.capture)S(e.key),b++}}this.W=j};var Vb=p.window;function Wb(a){if("function"==typeof a.T)return a.T();if(u(a))return a.split("");if(fa(a)){for(var b=[],c=a.length,d=0;d<c;d++)b.push(a[d]);return b}return Ya(a)}function Xb(a,b,c){if("function"==typeof a.forEach)a.forEach(b,c);else if(fa(a)||u(a))A(a,b,c);else{var d;if("function"==typeof a.fa)d=a.fa();else if("function"!=typeof a.T)if(fa(a)||u(a)){d=[];for(var f=a.length,e=0;e<f;e++)d.push(e)}else d=Za(a);else d=g;for(var f=Wb(a),e=f.length,h=0;h<e;h++)b.call(c,f[h],d&&d[h],a)}};function Yb(a,b){this.M={};this.c=[];var c=arguments.length;if(1<c){if(c%2)throw Error("Uneven number of arguments");for(var d=0;d<c;d+=2)this.set(arguments[d],arguments[d+1])}else if(a){a instanceof Yb?(c=a.fa(),d=a.T()):(c=Za(a),d=Ya(a));for(var f=0;f<c.length;f++)this.set(c[f],d[f])}}n=Yb.prototype;n.d=0;n.ab=0;n.T=function(){Zb(this);for(var a=[],b=0;b<this.c.length;b++)a.push(this.M[this.c[b]]);return a};n.fa=function(){Zb(this);return this.c.concat()};
function Zb(a){if(a.d!=a.c.length){for(var b=0,c=0;b<a.c.length;){var d=a.c[b];Object.prototype.hasOwnProperty.call(a.M,d)&&(a.c[c++]=d);b++}a.c.length=c}if(a.d!=a.c.length){for(var f={},c=b=0;b<a.c.length;)d=a.c[b],Object.prototype.hasOwnProperty.call(f,d)||(a.c[c++]=d,f[d]=1),b++;a.c.length=c}}n.set=function(a,b){Object.prototype.hasOwnProperty.call(this.M,a)||(this.d++,this.c.push(a),this.ab++);this.M[a]=b};n.clone=function(){return new Yb(this)};function $b(a){return ac(a||arguments.callee.caller,[])}
function ac(a,b){var c=[];if(B(b,a))c.push("[...circular reference...]");else if(a&&50>b.length){c.push(bc(a)+"(");for(var d=a.arguments,f=0;f<d.length;f++){0<f&&c.push(", ");var e;e=d[f];switch(typeof e){case "object":e=e?"object":"null";break;case "string":break;case "number":e=String(e);break;case "boolean":e=e?"true":"false";break;case "function":e=(e=bc(e))?e:"[fn]";break;default:e=typeof e}40<e.length&&(e=e.substr(0,40)+"...");c.push(e)}b.push(a);c.push(")\n");try{c.push(ac(a.caller,b))}catch(h){c.push("[exception trying to get caller]\n")}}else a?
c.push("[...long stack...]"):c.push("[end]");return c.join("")}function bc(a){if(cc[a])return cc[a];a=String(a);if(!cc[a]){var b=/function ([^\(]+)/.exec(a);cc[a]=b?b[1]:"[Anonymous]"}return cc[a]}var cc={};function dc(a,b,c,d,f){this.reset(a,b,c,d,f)}dc.prototype.Ua=0;dc.prototype.pa=j;dc.prototype.oa=j;var ec=0;dc.prototype.reset=function(a,b,c,d,f){this.Ua="number"==typeof f?f:ec++;this.Hb=d||ma();this.K=a;this.Na=b;this.Bb=c;delete this.pa;delete this.oa};dc.prototype.Ba=aa("K");function T(a){this.Oa=a}T.prototype.p=j;T.prototype.K=j;T.prototype.r=j;T.prototype.sa=j;function fc(a,b){this.name=a;this.value=b}fc.prototype.toString=ba("name");var gc=new fc("SEVERE",1E3),hc=new fc("WARNING",900),ic=new fc("CONFIG",700),jc=new fc("FINE",500);n=T.prototype;n.getParent=ba("p");n.qa=function(){this.r||(this.r={});return this.r};n.Ba=aa("K");function kc(a){return a.K?a.K:a.p?kc(a.p):j}
n.log=function(a,b,c){if(a.value>=kc(this).value){a=this.Ja(a,b,c);b="log:"+a.Na;p.console&&(p.console.timeStamp?p.console.timeStamp(b):p.console.markTimeline&&p.console.markTimeline(b));p.msWriteProfilerMark&&p.msWriteProfilerMark(b);for(b=this;b;){var c=b,d=a;if(c.sa)for(var f=0,e=g;e=c.sa[f];f++)e(d);b=b.getParent()}}};
n.Ja=function(a,b,c){var d=new dc(a,String(b),this.Oa);if(c){d.pa=c;var f;var e=arguments.callee.caller;try{var h;var l=da("window.location.href");if(u(c))h={message:c,name:"Unknown error",lineNumber:"Not available",fileName:l,stack:"Not available"};else{var m,q,r=k;try{m=c.lineNumber||c.Ab||"Not available"}catch(s){m="Not available",r=i}try{q=c.fileName||c.filename||c.sourceURL||l}catch(ka){q="Not available",r=i}h=r||!c.lineNumber||!c.fileName||!c.stack?{message:c.message,name:c.name,lineNumber:m,
fileName:q,stack:c.stack||"Not available"}:c}f="Message: "+qa(h.message)+'\nUrl: <a href="view-source:'+h.fileName+'" target="_new">'+h.fileName+"</a>\nLine: "+h.lineNumber+"\n\nBrowser stack:\n"+qa(h.stack+"-> ")+"[end]\n\nJS stack traversal:\n"+qa($b(e)+"-> ")}catch(D){f="Exception trying to expose exception! You win, we lose. "+D}d.oa=f}return d};function U(a,b){a.log(jc,b,g)}var lc={},mc=j;
function nc(a){mc||(mc=new T(""),lc[""]=mc,mc.Ba(ic));var b;if(!(b=lc[a])){b=new T(a);var c=a.lastIndexOf("."),d=a.substr(c+1),c=nc(a.substr(0,c));c.qa()[d]=b;b.p=c;lc[a]=b}return b};function oc(a){a=String(a);if(/^\s*$/.test(a)?0:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r\u2028\u2029\x00-\x08\x10-\x1f\x80-\x9f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,"")))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);};function pc(){}pc.prototype.O=j;var qc;function rc(){}x(rc,pc);function sc(a){return(a=tc(a))?new ActiveXObject(a):new XMLHttpRequest}function uc(a){var b={};tc(a)&&(b[0]=i,b[1]=i);return b}
function tc(a){if(!a.ua&&"undefined"==typeof XMLHttpRequest&&"undefined"!=typeof ActiveXObject){for(var b=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],c=0;c<b.length;c++){var d=b[c];try{return new ActiveXObject(d),a.ua=d}catch(f){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed");}return a.ua}qc=new rc;var vc=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^/?#]*)@)?([\\w\\d\\-\\u0100-\\uffff.%]*)(?::([0-9]+))?)?([^?#]+)?(?:\\?([^#]*))?(?:#(.*))?$");function wc(a){M.call(this);this.headers=new Yb;this.G=a||j}x(wc,Ub);wc.prototype.e=nc("goog.net.XhrIo");var xc=/^https?$/i,yc=[];function zc(a,b,c,d){var f=new wc;yc.push(f);b&&Ob(f,"complete",b);Ob(f,"ready",la(Ac,f));f.send(a,c,d,g)}function Ac(a){a.A();za(yc,a)}n=wc.prototype;n.q=k;n.b=j;n.$=j;n.ia="";n.xa="";n.I=0;n.J="";n.da=k;n.U=k;n.ha=k;n.u=k;n.Z=0;n.w=j;n.X="";n.bb=k;
n.send=function(a,b,c,d){if(this.b)throw Error("[goog.net.XhrIo] Object is active with another request");b=b?b.toUpperCase():"GET";this.ia=a;this.J="";this.I=0;this.xa=b;this.da=k;this.q=i;this.b=this.G?sc(this.G):sc(qc);this.$=this.G?this.G.O||(this.G.O=uc(this.G)):qc.O||(qc.O=uc(qc));this.b.onreadystatechange=w(this.Aa,this);try{U(this.e,V(this,"Opening Xhr")),this.ha=i,this.b.open(b,a,i),this.ha=k}catch(f){U(this.e,V(this,"Error opening Xhr: "+f.message));Bc(this,f);return}var a=c||"",e=this.headers.clone();
d&&Xb(d,function(a,b){e.set(b,a)});d=p.FormData&&a instanceof p.FormData;if(b="POST"==b)b=!Object.prototype.hasOwnProperty.call(e.M,"Content-Type")&&!d;b&&e.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");Xb(e,function(a,b){this.b.setRequestHeader(b,a)},this);this.X&&(this.b.responseType=this.X);"withCredentials"in this.b&&(this.b.withCredentials=this.bb);try{this.w&&(Vb.clearTimeout(this.w),this.w=j),0<this.Z&&(U(this.e,V(this,"Will abort after "+this.Z+"ms if incomplete")),
this.w=Vb.setTimeout(w(this.Xa,this),this.Z)),U(this.e,V(this,"Sending request")),this.U=i,this.b.send(a),this.U=k}catch(h){U(this.e,V(this,"Send error: "+h.message)),Bc(this,h)}};n.Xa=function(){"undefined"!=typeof ca&&this.b&&(this.J="Timed out after "+this.Z+"ms, aborting",this.I=8,U(this.e,V(this,this.J)),this.dispatchEvent("timeout"),this.abort(8))};function Bc(a,b){a.q=k;a.b&&(a.u=i,a.b.abort(),a.u=k);a.J=b;a.I=5;Cc(a);Dc(a)}
function Cc(a){a.da||(a.da=i,a.dispatchEvent("complete"),a.dispatchEvent("error"))}n.abort=function(a){this.b&&this.q&&(U(this.e,V(this,"Aborting")),this.q=k,this.u=i,this.b.abort(),this.u=k,this.I=a||7,this.dispatchEvent("complete"),this.dispatchEvent("abort"),Dc(this))};n.f=function(){this.b&&(this.q&&(this.q=k,this.u=i,this.b.abort(),this.u=k),Dc(this,i));wc.k.f.call(this)};n.Aa=function(){!this.ha&&!this.U&&!this.u?this.Qa():Ec(this)};n.Qa=function(){Ec(this)};
function Ec(a){if(a.q&&"undefined"!=typeof ca)if(a.$[1]&&4==Fc(a)&&2==Gc(a))U(a.e,V(a,"Local request error detected and ignored"));else if(a.U&&4==Fc(a))Vb.setTimeout(w(a.Aa,a),0);else if(a.dispatchEvent("readystatechange"),4==Fc(a)){U(a.e,V(a,"Request complete"));a.q=k;try{var b=Gc(a),c,d;a:switch(b){case 200:case 201:case 202:case 204:case 304:case 1223:d=i;break a;default:d=k}if(!(c=d)){var f;if(f=0===b){var e=String(a.ia).match(vc)[1]||j;if(!e&&self.location)var h=self.location.protocol,e=h.substr(0,
h.length-1);f=!xc.test(e?e.toLowerCase():"")}c=f}if(c)a.dispatchEvent("complete"),a.dispatchEvent("success");else{a.I=6;var l;try{l=2<Fc(a)?a.b.statusText:""}catch(m){U(a.e,"Can not get status: "+m.message),l=""}a.J=l+" ["+Gc(a)+"]";Cc(a)}}finally{Dc(a)}}}function Dc(a,b){if(a.b){var c=a.b,d=a.$[0]?ea:j;a.b=j;a.$=j;a.w&&(Vb.clearTimeout(a.w),a.w=j);b||a.dispatchEvent("ready");try{c.onreadystatechange=d}catch(f){a.e.log(gc,"Problem encountered resetting onreadystatechange: "+f.message,g)}}}
function Fc(a){return a.b?a.b.readyState:0}function Gc(a){try{return 2<Fc(a)?a.b.status:-1}catch(b){return a.e.log(hc,"Can not get status: "+b.message,g),-1}}
function Hc(a){try{if(!a.b)return j;if("response"in a.b)return a.b.response;switch(a.X){case "":case "text":return a.b.responseText;case "arraybuffer":if("mozResponseArrayBuffer"in a.b)return a.b.mozResponseArrayBuffer}a.e.log(gc,"Response type "+a.X+" is not supported on this browser",g);return j}catch(b){return U(a.e,"Can not get response: "+b.message),j}}function V(a,b){return b+" ["+a.xa+" "+a.ia+" "+Gc(a)+"]"};function Ic(a){M.call(this);this.Ka=a;this.c=[]}x(Ic,M);var Jc=[];function Kc(a,b,c){var d="click";"array"!=t(d)&&(Jc[0]=d,d=Jc);for(var f=0;f<d.length;f++){var e=Ob(b,d[f],c||a,k,a.Ka||a);a.c.push(e)}}Ic.prototype.f=function(){Ic.k.f.call(this);A(this.c,S);this.c.length=0};Ic.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented");};function W(){}W.ra=function(){return W.va?W.va:W.va=new W};W.prototype.Pa=0;W.ra();function X(a){M.call(this);this.ca=a||bb();this.Ta=Lc}x(X,Ub);X.prototype.La=W.ra();var Lc=j;n=X.prototype;n.ta=j;n.C=k;n.t=j;n.Ta=j;n.Ma=j;n.p=j;n.r=j;n.P=j;n.Ca=k;n.ea=ba("t");n.getParent=ba("p");n.ja=function(a){if(this.p&&this.p!=a)throw Error("Method not supported");X.k.ja.call(this,a)};
function Mc(a,b){if(a.C)throw Error("Component already rendered");if(b){a.Ca=i;if(!a.ca||a.ca.ba!=(9==b.nodeType?b:b.ownerDocument||b.document))a.ca=bb(b);a.H(b);a.B()}else throw Error("Invalid element to decorate");}n.H=aa("t");n.B=function(){this.C=i;Nc(this,function(a){!a.C&&a.ea()&&a.B()})};function Oc(a){Nc(a,function(a){a.C&&Oc(a)});if(a.s){var b=a.s;A(b.c,S);b.c.length=0}a.C=k}
n.f=function(){X.k.f.call(this);this.C&&Oc(this);this.s&&(this.s.A(),delete this.s);Nc(this,function(a){a.A()});if(!this.Ca&&this.t){var a=this.t;a&&a.parentNode&&a.parentNode.removeChild(a)}this.p=this.Ma=this.t=this.P=this.r=j};function Nc(a,b){a.r&&A(a.r,b,g)}
n.removeChild=function(a,b){if(a){var c=u(a)?a:a.ta||(a.ta=":"+(a.La.Pa++).toString(36)),d;this.P&&c?(d=this.P,d=(c in d?d[c]:g)||j):d=j;a=d;if(c&&a){d=this.P;c in d&&delete d[c];za(this.r,a);b&&(Oc(a),a.t&&(c=a.t)&&c.parentNode&&c.parentNode.removeChild(c));c=a;if(c==j)throw Error("Unable to set parent component");c.p=j;X.k.ja.call(c,j)}}if(!a)throw Error("Child is not in parent component");return a};function Y(){X.call(this)}x(Y,X);Y.prototype.H=function(a){Y.k.H.call(this,a);var b=ib(mb);a.innerHTML=b.innerHTML};Y.prototype.B=function(){Y.k.B.call(this);this.Za=db("user-list",this.ea());zc("/admin/_users",w(function(a){a=oc(Hc(a.target));a=ya(a,function(a){return new Gb(a)});A(a,this.Fa,this)},this))};
Y.prototype.Fa=function(a){var b;if(a.v){b=a.v.getMonth()+1+"/"+a.v.getDate()+"/"+a.v.getYear()+" ";var c=a.v,d,f=c.getHours();d!==g||(d=i);var e=12==f;12<f&&(f-=12,e=i);0==f&&d&&(f=12);f=String(f);f+=":"+y(c.getMinutes());d&&(c=na("am"),d=na("pm"),f+=e?d:c);b+=f}else b="Never";a=ib(nb,{n:a,v:b});this.Za.appendChild(a);Kc(this.s||(this.s=new Ic(this)),a,function(a){var b=gb(a.target,"button");if(b){var c=gb(a.target,"user").id;if(a=gb(a.target,"controls")){var d=B(H(b),"2")?2:B(H(b),"0")?0:1;zc("/admin/_access",
Hb,"POST","uid="+c+"&level="+d);A(fb(a),function(a){B(H(a),d.toString())?I(a,"selected"):Xa(a,"selected")})}else B(H(b),"demo")&&((a=!B(H(b),"selected"))?I(b,"selected"):Xa(b,"selected"),zc("/admin/_demo",Hb,"POST","demo="+a+"&uid="+c))}})};function Pc(){X.call(this);this.$a=new Y}x(Pc,X);Pc.prototype.H=function(a){Pc.k.H.call(this,a);a=cb("sections");this.Q=cb("content");this.z=db("users",a);Kc(this.s||(this.s=new Ic(this)),a,function(a){Xa(this.z,"selected");this.z=a.target;I(this.z,"selected");this.Q.className="";B(H(this.z),"users")?I(this.Q,"users"):B(H(this.z),"stats")?I(this.Q,"stats"):B(H(this.z),"channels")&&I(this.Q,"channels")})};Pc.prototype.B=function(){Pc.k.B.call(this);Mc(this.$a,cb("users"))};
function Qc(){Mc(new Pc,cb("content"))}var Rc=["brkn","Admin","init"],Z=p;!(Rc[0]in Z)&&Z.execScript&&Z.execScript("var "+Rc[0]);for(var Sc;Rc.length&&(Sc=Rc.shift());)!Rc.length&&Qc!==g?Z[Sc]=Qc:Z=Z[Sc]?Z[Sc]:Z[Sc]={};