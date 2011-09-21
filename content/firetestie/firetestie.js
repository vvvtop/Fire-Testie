var FireTestie = {};
var boxModelHighlighter = null;
var frameHighlighter = null;
const inspectDelay = 200;
const DEBUG=false;


FBL.ns(function () {with (FBL) {


var HIGHLIGHTTYPE = 'boxModel',
BOXFRAME = 'border',
READYTIMEOUT = 1,
BOXDES = 15,

//
config = Firebug.getModuleLoaderConfig(),
modules = [
    "firebug/lib/css",
    "firebug/lib/dom",
    "firebug/lib/events",
    "firebug/firefox/menu",
    "firebug/lib/wrapper",
    "firebug/lib/xml"
],
fireTestiePanel = function () {},
undefined;
var _highlightObject_old = function () {
    var re = Firebug.Inspector.highlightObject;
    return function () {
        return re;
    }
}
();
var evt = function () {
    var list = [];
    return {
        addListerner : function (element, type, callback) {
            element.addEventListener(type, callback, true);
            list.push({
                    element : element,
                    callback : callback,
                    type : type
                });
        },
        removeListener : function (element, type, callback) {
            element.removeEventListener(type, callback, true);
        },
        removeAll : function () {
            try {
                for (var index in list) {
                    evt.removeListener(list[index].element, list[index].type, list[index].callback, true);
                }
            } catch (e) {}
            
        }
    };
}
();
var log = function (ele) {
    DEBUG && Firebug.Console.log(ele);
};
require(config, modules, function (Css, Dom, Events, Menu, Wrapper, Xml) {
    fireTestiePanel.prototype = FBL.extend(Firebug.Panel, function () {
        function isVisibleElement(elt) {
            var invisibleElements = {
                "head" : true,
                "base" : true,
                "basefont" : true,
                "isindex" : true,
                "link" : true,
                "meta" : true,
                "script" : true,
                "style" : true,
                "title" : true
            };
            
            return !invisibleElements[elt.nodeName.toLowerCase()];
        }
        
        function storeHighlighterParams(highlighter, context, element, boxFrame, colorObj,
            highlightType, isMulti) {
            var fir = Firebug.Inspector.repaint;
            
            fir.highlighter = highlighter;
            fir.context = context;
            fir.element = element;
            fir.boxFrame = boxFrame;
            fir.colorObj = colorObj;
            fir.highlightType = highlightType;
            fir.isMulti = isMulti;
            
            Firebug.Inspector.highlightedContext = context;
        }
        function getHighlighter(type) {
            if (type == "boxModel") {
                if (!boxModelHighlighter)
                    boxModelHighlighter = new Firebug.Inspector.BoxModelHighlighter();
                
                return boxModelHighlighter;
            } else if (type == "frame") {
                if (!frameHighlighter)
                    frameHighlighter = new Firebug.Inspector.FrameHighlighter();
                
                return frameHighlighter;
            }
        }
        var _highlightObject = function (elementArr, context, highlightType, boxFrame, colorObj) {
            var i,
            elt,
            elementLen,
            oldContext,
            usingColorArray;
            var highlighter = highlightType ? getHighlighter(highlightType) : this.defaultHighlighter;
            
            if (!elementArr || !FirebugReps.Arr.isArray(elementArr)) {
                // highlight a single element
                if (!elementArr || !Dom.isElement(elementArr) ||
                    (Wrapper.getContentView(elementArr) &&
                        !Xml.isVisible(Wrapper.getContentView(elementArr)))) {
                    if (elementArr && elementArr.nodeType == 3)
                        elementArr = elementArr.parentNode;
                    else
                        elementArr = null;
                }
                
                if (elementArr && context && context.highlightTimeout) {
                    context.clearTimeout(context.highlightTimeout);
                    delete context.highlightTimeout;
                }
                
                oldContext = this.highlightedContext;
                if (oldContext && oldContext.window)
                    this.clearAllHighlights();
                
                // Stop multi element highlighting
                if (!elementArr)
                    this.repaint.element = null;
                
                this.highlighter = highlighter;
                this.highlightedContext = context;
                
                if (elementArr) {
                    if (!isVisibleElement(elementArr))
                        highlighter.unhighlight(context);
                    else if (context && context.window && context.window.document)
                        highlighter.highlight(context, elementArr, boxFrame, colorObj, false);
                } else if (oldContext) {
                    oldContext.highlightTimeout = oldContext.setTimeout(function () {
                                
                                delete oldContext.highlightTimeout;
                                
                                if (oldContext.window && oldContext.window.document) {
                                    highlighter.unhighlight(oldContext);
                                    
                                    if (oldContext.inspectorMouseMove)
                                        oldContext.window.document.removeEventListener("mousemove",
                                            oldContext.inspectorMouseMove, true);
                                }
                            }, inspectDelay);
                }
            } else {
                // Highlight multiple elements
                if (context && context.highlightTimeout) {
                    context.clearTimeout(context.highlightTimeout);
                    delete context.highlightTimeout;
                }
                this.clearAllHighlights();
                usingColorArray = FirebugReps.Arr.isArray(colorObj);
                
                if (context && context.window && context.window.document) {
                    for (i = 0, elementLen = elementArr.length; i < elementLen; i++) {
                        elt = elementArr[i];
                        
                        if (elt && elt instanceof HTMLElement) {
                            if (elt.nodeType === 3)
                                elt = elt.parentNode;
                            
                            if (usingColorArray)
                                highlighter.highlight(context, elt, boxFrame, colorObj[i], true);
                            else
                                highlighter.highlight(context, elt, boxFrame, colorObj, true);
                        }
                    }
                }
                
                storeHighlighterParams(null, context, elementArr, boxFrame, colorObj, highlightType, true);
            }
        }
        var document,
        
        readyTimeout,
        
        context,
        
        styleSheet,
        
        ftBox,
        
        tmpDoc,
        
        flag = false,
        
        isAlt = false,
        
        multi = [],
        
        isMulti = false,
        
        drawBox = function () {},
        
        windowX = 0,
        
        windowY = 0,
        
        //UI
        EnableBtnElement,
        initialize = function () {
            Firebug.Panel.initialize.apply(this, arguments);
        },
        ready = function () {
            waitReady();
        },
        waitReady = function () {
            if (!document || !(document instanceof window.Document)) {
                if (window &&
                    window.getBrowser &&
                    window.getBrowser().selectedBrowser &&
                    window.getBrowser().selectedBrowser.contentDocument) {
                    document = window.getBrowser().selectedBrowser.contentDocument;
                    readyTimeout && clearTimeout(readyTimeout);
                    
                    start();
                } else {
                    readyTimeout = setTimeout(function () {
                                waitReady();
                            }, 1)
                }
                try {
                    document = window.getBrowser().selectedBrowser.contentDocument;
                    
                } catch (e) {};
            }
        },
        onHotKeyUp = function () {
            var lastKeydown = false,
            tout = 0;
            return function (e) {
                /* if(e.keyCode===17){
                lastKeydown+=keyCode;
                if(lastKeydown===0){
                tout=setTimeout(function(){
                if(lastKeydown%17===0 && lastKeydown>17){
                isMulti=false;
                lastKeydown=0;
                Firebug.Inspector.clearAllHighlights();
                }
                },700)
                }
                } */
                if (e.keyCode === 17) {
                    //document.addEventListener("click",clickBody,true);
                    log('按下ctrl,lastKeydown=' + (lastKeydown ? 'true' : 'false'));
                    if (!isMulti) {
                        isMulti = true;
                    } else {
                        if (lastKeydown) {
                            log('1s内连续敲击了两次');
                            multi = [];
                            Firebug.Inspector.clearAllHighlights();
                            isMulti = false;
                            lastKeydown = false;
                            var pbox = document.getElementById('pbox');
                            if (pbox) {
                                document.body.removeChild(pbox);
                            }
                            clearTimeout(tout);
                        } else {
                            lastKeydown = true;
                            tout = setTimeout(function () {
                                        lastKeydown = false;
                                        
                                    }, 1000);
                        }
                        
                    }
                }
            };
        }
        (),
        onAlt = function (e) {
            if (e.keyCode === 16) {
                onInspectingMouseOut(e);
                hide();
                evt.addListerner(e.target.ownerDocument, 'keyup', function (e) {
                        if (e.keyCode === 16 || e.shiftKey) {
                            show();
                            Events.cancelEvent(e);
                        }
                    });
                Events.cancelEvent(e);
            }
        },
        start = function () {
            if (EnableBtnElement)
                EnableBtnElement.value = "Disabled";
            windowX = document.documentElement.clientWidth;
            windowY = document.documentElement.clientHeight;
            evt.addListerner(document.defaultView, "resize", function (e) {
                    windowX = document.documentElement.clientWidth;
                    windowY = document.documentElement.clientHeight;
                });
            /* document.defaultView.addEventListener("resize",function(e){
            windowX=document.documentElement.clientWidth;
            windowY=document.documentElement.clientHeight;
            },true); */
            
            context = Firebug.currentContext;
            
            /* document.addEventListener("mouseover",onInspectingMouseOver,true);
            document.addEventListener("mouseout",onInspectingMouseOut,true); */
            evt.addListerner(document, "mouseover", onInspectingMouseOver);
            evt.addListerner(document, "mouseout", onInspectingMouseOut);
            //evt.addListerner(document,"keydown",function(){
            function clickBody(e) {
                //这里不能使用任何阻塞的代码……要不然会不能正常注销
                log('组合键 CLICK >3<');
                if (multi.length === 0 || multi[multi.length - 1] !== e.target) {
                    multi.push(e.target);
                }
                
                multi.length > 2 && multi.shift();
                log(multi);
                onInspectingMouseOver(e);
            }
            evt.addListerner(document, 'keydown', onAlt);
            evt.addListerner(document, "keyup", onHotKeyUp);
            /* document.addEventListener('keyup',function(e){
            //if(e.ctrlKey){
            multi=[];
            Firebug.Inspector.clearAllHighlights();
            isMulti=false;
            //document.removeEventListener("click",clickBody,true);
            //}
            },true); */
            
            drawBox = function () {
                if (!flag) {
                    var tmp = document.getElementById('xxxxdialog');
                    if (tmp) {
                        ftBox = tmp;
                    } else {
                        ftBox = document.createElement('dialog');
                        ftBox.id = "xxxxdialog";
                    }
                    
                    flag = true;
                } else {
                    ftBox.innerHTML = '';
                }
                
                return function (args) {
                    ftBox.innerHTML = '';
                    //Firebug.Console.log(args);
                    for (arg in args) {
                        var style = args[arg].ownerDocument.defaultView
                            .getComputedStyle(args[arg], ""),
                        boxStyle = Css.readBoxStyles(style),
                        fontStyles = readFontStyles(style),
                        cssTableInner = '<table><tbody>',
                        offset = Dom.getLTRBWH(args[arg]),
                        x = offset.left - Math.abs(boxStyle.marginLeft),
                        y = offset.top - Math.abs(boxStyle.marginTop),
                        w = offset.width - (boxStyle.paddingLeft +
                                boxStyle.paddingRight + boxStyle.borderLeft +
                                boxStyle.borderRight),
                        h = offset.height - (boxStyle.paddingTop +
                                boxStyle.paddingBottom + boxStyle.borderTop +
                                boxStyle.borderBottom),
                        
                        //styleSheet=document.createElement('style'),
                        styleSheet = document.createElement('link'),
                        title = document.createElement('h1'),
                        csstable = document.createElement('csstable'),
                        layout = document.createElement('layout'),
                        clear = document.createElement('div');
                        
                        ftBox.appendChild(title);
                        ftBox.appendChild(csstable);
                        ftBox.appendChild(layout);
                        ftBox.appendChild(clear);
                        
                        //styleSheet.innerHTML='dialog dialog h1,dialog h2,dialog h3,dialog h4,dialog h5,dialog h6,dialog p,dialog hr,dialog article,dialog aside,dialog section,dialog figure,dialog footer,dialog header,dialogdl,dialog dt,dialog dd,dialog ul,dialog ol,dialog li,dialog th,dialog td,dialogform,dialog fieldset,dialog input,dialog button,dialog textarea,dialog *{margin:0;padding:0;}dialog header,dialog nav,dialog footer,dialog wrapper,dialog csstable,dialog marginbox,dialog contentbox,dialog paddingbox,dialog borderbox,dialog section{display:block;}dialog button,dialog input,dialog select,dialog textarea{font:12px/1 Tahoma,Arial;}dialog button,dialog h1,dialog h2,dialog h3,dialog h4,dialog h5,dialog h6{font-size:100%;font:normal 12px Tahoma,Arial;}dialog li{list-style:none;}dialog button,dialog input,dialog select,dialog textarea{font-size:100%;border:none;background:none;}dialog input:focus,dialog textarea:focus{outline:none;}dialog fieldset,dialog img{border:0 none;}dialog img{vertical-align:middle;}dialog table{border:0 none !important;margin:0 !important;padding:border-collapse:collapse;border-spacing:0;}dialog q:before,dialog q:after{content:"";}dialog address,dialog cite,dialog em{font-style:normal;}dialog{z-index:2147483647;border:1px solid #eee;display:block;position:absolute;top:200px;left:200px;width:490px;height:auto;-moz-border-radius:3px;-moz-box-shadow:0 0 10px rgba(0,0,0,0.2);background:#ededed;margin:0;padding:0;text-align:start;color:#333;font-family:Arial;font-size:11px;}layout{position:relative;width:100%;width:284px;float:left;}dialog h1{margin:0;padding:0;color:#F47A24;font-size:22px;font-weight:bold;font-family:Arial;line-height:140%;text-indent:5px;border-bottom:1px dashed #d5d5d5;height:31px;text-align:left;background:#112;-moz-border-radius:3px 3px 0 0;border-radius:3px 3px 0 0;}csstable{font-size:11px;margin:7px auto auto 15px;border-right:1px dashed #d5d5d5;width:190px;float:left;}csstable tr{height:16px;}csstable .cssname{width:102px;font-weight:bold;}marginbox,contentbox,paddingbox,borderbox{margin:17px auto;}marginbox{width:200px;height:140px;border:1px dashed #000;}borderbox{width:150px;height:100px;border:1px dashed #000;}paddingbox{width:100px;height:60px;border:1px dashed #000;}contentbox{width:50px;height:20px;border:1px dashed #000;}.layout-figure{position:absolute;font-size:10px;}.figure_x{top:77px;}.figure_y{right:138px}.margin-left{right:219px;text-align:right;}.margin-right{left:220px;text-align:left;}.margin-top{top:24px;}.margin-bottom{top:136px;}.border-left{right:194px;text-align:right;}.border-right{left:194px;text-align:left;}.border-top{top:41px;}.border-bottom{top:114px;}.offset-left{right:245px;text-align:right;}.offset-right{left:245px;text-align:left;}.offset-top{top:6px;}.offset-bottom{top:158px;}.padding-left{right:170px;text-align:right;}.padding-right{left:170px;text-align:left;}.padding-top{top:60px;}.padding-bottom{top:94px;}.label-margin{top:19px;left:43px;}.label-border{top:38px;left:69px;}.label-padding{top:56px;left:95px;}.label-content{margin-top:4px;margin-left:auto;margin-right:auto;width:100%;hight:100%;display:block;text-align:center;}.label-offset{left:38px;top:5px;}';
                        styleSheet.setAttribute('href', 'resource://firetestie_r/firetestie.css');
                        styleSheet.setAttribute('rel', 'stylesheet');
                        ftBox.appendChild(styleSheet);
                        ftBox.style.display = 'none';
                        document.body.appendChild(ftBox);
                        
                        //clear float
                        clear.style.clear = 'both';
                        //Firebug.Console.log(boxStyle);
                        
                        title.innerHTML = args[arg].tagName + '<span class="match">' + match(args[arg]) + '</span>' || 'N/A';
                        
                        if (fontStyles) {
                            for (var ele in fontStyles) {
                                cssTableInner += ('<tr><td class="cssname">' +
                                    ele + '</td><td>' +
                                    fontStyles[ele] +
                                    '</td></tr>');
                            }
                        }
                        cssTableInner += '</tbody></table>';
                        csstable.innerHTML = cssTableInner;
                        //Math.ceil(1.3)
                        layout.innerHTML = '<span class="layout-figure offset-left figure_x" id="">' + Math.ceil(x) + '</span>' +
                            '<span class="layout-figure offset-right figure_x" id="">0</span>' +
                            '<span class="layout-figure offset-top figure_y" id="">' + Math.ceil(y) + '</span>' +
                            '<span class="layout-figure offset-bottom figure_y" id="">0</span>' +
                            '<span class="layout-figure margin-left figure_x" id="">' + Math.ceil(boxStyle['marginLeft']) + '</span>' +
                            '<span class="layout-figure margin-right figure_x" id="">' + Math.ceil(boxStyle['marginRight']) + '</span>' +
                            '<span class="layout-figure margin-top figure_y" id="">' + Math.ceil(boxStyle['marginTop']) + '</span>' +
                            '<span class="layout-figure margin-bottom figure_y" id="">' + Math.ceil(boxStyle['marginBottom']) + '</span>' +
                            '<span class="layout-figure border-left figure_x" id="">' + Math.ceil(boxStyle['borderLeft']) + '</span>' +
                            '<span class="layout-figure border-right figure_x" id="">' + Math.ceil(boxStyle['borderRight']) + '</span>' +
                            '<span class="layout-figure border-top figure_y" id="">' + Math.ceil(boxStyle['borderTop']) + '</span>' +
                            '<span class="layout-figure border-bottom figure_y" id="">' + Math.ceil(boxStyle['borderBottom']) + '</span>' +
                            '<span class="layout-figure padding-left figure_x" id="">' + Math.ceil(boxStyle['paddingLeft']) + '</span>' +
                            '<span class="layout-figure padding-right figure_x" id="">' + Math.ceil(boxStyle['paddingRight']) + '</span>' +
                            '<span class="layout-figure padding-top figure_y" id="">' + Math.ceil(boxStyle['paddingTop']) + '</span>' +
                            '<span class="layout-figure padding-bottom figure_y" id="">' + Math.ceil(boxStyle['paddingBottom']) + '</span>' +
                            '<span class="layout-figure label-margin" id="">Margin</span>' +
                            '<span class="layout-figure label-border" id="">Border</span>' +
                            '<span class="layout-figure label-padding" id="">Padding</span>' +
                            '<span class="layout-figure label-offset" id="">offset</span>' +
                            '<marginbox><borderbox><paddingbox><contentbox>' +
                            '<span class="label-content" id="">' + Math.ceil(w) + '*' + Math.ceil(h) + '</span>' +
                            '</contentbox></paddingbox></borderbox></marginbox>';
                        //ftBox=inner;
                    }
                    
                }
            }
            ();
            
        },
        readFontStyles = function (style) {
            const styleNames = {
                'font-family' : 'fontFamily',
                'font-size' : 'fontSize',
                'font-weight' : 'fontWeight',
                'font-style' : 'fontStyle',
                'font-size-adjust' : 'fontSizeAdjust',
                'color' : 'color',
                /* 'text-transform':'textTransform',
                'text-decoration':'textDecoration',
                'letter-spacing':'letterSpacing',
                'word-spacing':'wordSpacing', */
                'line-height' : 'lineHeight',
                'text-align' : 'textAlign',
                'vertical-align' : 'verticalAlign',
                /* 'direction':'direction', */
                'background-color' : 'backgroundColor',
            };
            
            var styles = {};
            for (var styleName in styleNames) {
                styles[styleNames[styleName]] =
                    (style.getPropertyCSSValue(styleName).cssText) || '';
            }
            
            return styles;
        },
        onInspectingClick = function (e) {
            /* if(e.ctrlKey){
            var win = (e.target.ownerDocument ? e.target.ownerDocument.defaultView : null),
            style=(frameDoc||e.currentTarget).defaultView.getComputedStyle(e.target,""),
            boxStyle=Css.readBoxStyles(style),
            cssTableInner="",
            offset = Dom.getLTRBWH(e.target),
            x = offset.left - Math.abs(boxStyle.marginLeft),
            y = offset.top - Math.abs(boxStyle.marginTop),
            w = offset.width - (boxStyle.paddingLeft + boxStyle.paddingRight + boxStyle.borderLeft + boxStyle.borderRight),
            h = offset.height - (boxStyle.paddingTop + boxStyle.paddingBottom + boxStyle.borderTop + boxStyle.borderBottom);
            
            multi.element=e.target;
            multi.drawArgs={
            title:(e.target.tagName+(e.target.id?('#'+e.target.id):'')),
            css:style,
            x:x,
            y:y,
            w:w,
            h:h
            };
            Firebug.Console.log('ctrl+mouse1');
            } */
            /* if(e.ctrlKey){
            multi.push(e.target);
            Firebug.Console.log('CTRL-CLICK');
            }
            Firebug.Console.log(e);
            Firebug.Console.log('CLICK'); */
            if (isMulti) {
                if (multi.length === 0 || multi[multi.length - 1] !== e.target) {
                    multi.push(e.target);
                }
                
                multi.length > 2 && multi.shift();
                log(multi);
                onInspectingMouseOver(e);
                /* var la=document.createElement('img');
                la.src="resource://firetestie_r/data.png";
                document.body.appendChild(la); */
                if (multi.length == 2) {
                    showPbox(multi[0], multi[1]);
                }
                
            }
            Events.cancelEvent(e);
        },
        showPbox = function (ele1, ele2) {
            var pbox = document.getElementById('pbox'),
            a = getLTRBWH(ele1),
            b = getLTRBWH(ele2);
            if (!pbox) {
                pbox = document.createElement('div');
                pbox.setAttribute('id', 'pbox');
                pbox.setAttribute('class', 'firebugResetStyles pbox');
                
                document.body.appendChild(pbox);
                /* evt.addListerner(pbox,'mouseover',function(){
                pbox.style.opacity='0.4';
                }); */
                
                //fix一个奇怪的bug
                pbox.style.zIndex = '99999999999999999999999999999999999999999';
            }
            pbox.setAttribute('style',"right:298px !important;top:5px !important; ");
            pbox.innerHTML = '<div class="firebugResetStyles wrapper">' +
                '<div class="firebugResetStyles tag_a">' + ele1.tagName + '</div>' +
                '<div class="firebugResetStyles tag_b">' + ele2.tagName + '</div>' +
                '<div class="firebugResetStyles d1">' + parseInt(b.y - a.y) + 'px</div>' +
                '<div class="firebugResetStyles d2">' + parseInt(b.y - (a.y + a.h)) + 'px</div>' +
                '<div class="firebugResetStyles d3">' + parseInt(b.x - (a.x + a.w)) + 'px</div>' +
                '<div class="firebugResetStyles d4">' + parseInt(b.x - a.x) + 'px</div>' +
                '</div>';
        },
        onInspectingMouseMove = function (e) {
            /* var f=false,
            tout=0;
            return function(e){
            if(!f){
            if(ftBox){
            var frameOffset=getFrameOffset(e.target.ownerDocument.defaultView);
            
            setftBox((e.clientX+frameOffset.left),(e.clientY+frameOffset.top));
            // if(multi.length>2){
            // showPbox(multi[0],multi[1]);
            // }
            
            }
            setTimeout(function(){
            f=true;
            },10);
            }
            }; */
            if (ftBox) {
                var frameOffset = getFrameOffset(e.target.ownerDocument.defaultView);
                
                setftBox((e.clientX + frameOffset.left), (e.clientY + frameOffset.top));
                // if(multi.length>2){
                // showPbox(multi[0],multi[1]);
                // }
                
            }
        },
        getLTRBWH = function (ele) {
            var offset = Dom.getLTRBWH(ele),
            style = ele.ownerDocument.defaultView.getComputedStyle(ele, ""),
            boxStyle = Css.readBoxStyles(style),
            frameOffset = getFrameOffset(ele.ownerDocument.defaultView),
            w = offset.width - (boxStyle.paddingLeft +
                    boxStyle.paddingRight + boxStyle.borderLeft +
                    boxStyle.borderRight),
            h = offset.height - (boxStyle.paddingTop +
                    boxStyle.paddingBottom + boxStyle.borderTop +
                    boxStyle.borderBottom),
            x = offset.left - Math.abs(boxStyle.marginLeft) +
                frameOffset.left,
            y = offset.top - Math.abs(boxStyle.marginTop) +
                frameOffset.top;
            return {
                x : x,
                y : y,
                w : w,
                h : h,
            };
        },
        setftBox = function (x, y) {
            var ftBoxOffset = Dom.getLTRBWH(ftBox),
            style = document.defaultView.getComputedStyle(ftBox, ""),
            boxStyle = Css.readBoxStyles(style),
            w = ftBoxOffset.width - (boxStyle.paddingLeft +
                    boxStyle.paddingRight + boxStyle.borderLeft +
                    boxStyle.borderRight),
            h = ftBoxOffset.height - (boxStyle.paddingTop +
                    boxStyle.paddingBottom + boxStyle.borderTop +
                    boxStyle.borderBottom),
            tX = 0,
            tY = 0;
            //y=document.documentElement.scrollTop+y;
            ftBox.style.position = 'fixed';
            ftBox.style.opacity = '0.9';
            
            if (windowX - w - BOXDES - x < 0) {
                tX = x - BOXDES - w;
            } else {
                tX = x + BOXDES;
            }
            if (windowY - h - BOXDES - y < 0) {
                tY = y - BOXDES - h;
            } else {
                tY = y + BOXDES;
            }
            if (tY < 0)
                tY = 0;
            if (tX < 0)
                tX = 0;
            ftBox.style.top = tY + 'px';
            ftBox.style.left = tX + 'px';
            ftBox.style.display = 'block';
        },
        onInspectingMouseOut = function (e) {
            if (ftBox !== undefined) {
                //ftBox.removeEventListener("mousemove",onInspectingMouseMove,true);
                evt.removeListener(ftBox, "mousemove", onInspectingMouseMove);
                ftBox.style.display = 'none';
            }
            if (e.target.ownerDocument.defaultView.parent !== e.target.ownerDocument.defaultView) {
                //e.target.ownerDocument.defaultView.parent.document.addEventListener("mouseover",onInspectingMouseOver,true);
                evt.addListerner(e.target.ownerDocument.defaultView.parent.document,
                    "mouseover", onInspectingMouseOver);
            }
            //e.target.ownerDocument.removeEventListener("click",onInspectingClick,true);
            evt.removeListener(e.target.ownerDocument,
                "click", onInspectingClick);
            lastDom = e.target;
        },
        onInspectingMouseOver = function (e) {
            /* if(multi==={}){
            Firebug.Inspector.
            highlightObject(e.target,context,HIGHLIGHTTYPE,BOXFRAME,"green",true);
            }else{
            Firebug.Inspector.
            highlightObject([e.target,multi],context,HIGHLIGHTTYPE,BOXFRAME,"green",true);
            } */
            if (multi.length === 0) {
                /* Firebug.Inspector.
                highlightObject(e.target, context, HIGHLIGHTTYPE, BOXFRAME, "#FCFFA7", true); */
                _highlightObject.call(Firebug.Inspector, e.target, context, HIGHLIGHTTYPE, BOXFRAME, "#FCFFA7", true);
            } else {
                log(multi);
                /* Firebug.Inspector.
                highlightObject(multi, context, HIGHLIGHTTYPE, BOXFRAME, ["#FCFFA7",'green'], true); */
                _highlightObject.call(Firebug.Inspector, multi, context, HIGHLIGHTTYPE, BOXFRAME, ["#FCFFA7", 'green'], true);
            }
            
            //e.target.ownerDocument.addEventListener("click",onInspectingClick,true);
            evt.addListerner(e.target.ownerDocument, "click", onInspectingClick);
            evt.addListerner(e.target.ownerDocument, "keyup", onHotKeyUp);
            evt.addListerner(e.target.ownerDocument, 'keydown', onAlt);
            
            var win = (e.target.ownerDocument ? e.target.ownerDocument.defaultView : null),
            style = (frameDoc || e.currentTarget)
            .defaultView.getComputedStyle(e.target, ""),
            boxStyle = Css.readBoxStyles(style),
            cssTableInner = "",
            offset = Dom.getLTRBWH(e.target),
            x = offset.left - Math.abs(boxStyle.marginLeft),
            y = offset.top - Math.abs(boxStyle.marginTop),
            w = offset.width - (boxStyle.paddingLeft +
                    boxStyle.paddingRight +
                    boxStyle.borderLeft +
                    boxStyle.borderRight),
            h = offset.height - (boxStyle.paddingTop +
                    boxStyle.paddingBottom +
                    boxStyle.borderTop +
                    boxStyle.borderBottom);
            
            if (e.target.tagName === 'IFRAME' || e.target.tagName === 'FRAMESET') {
                var frameDoc = e.target.contentWindow.document;
                //frameDoc.addEventListener("mouseover",onInspectingMouseOver,true);
                evt.addListerner(frameDoc, "mouseover", onInspectingMouseOver);
                //frameDoc.addEventListener("mouseout",onInspectingMouseOut,true);
                evt.addListerner(frameDoc, "mouseout", onInspectingMouseOut);
                //e.target.contentWindow.parent.document.removeEventListener('mouseover',onInspectingMouseOver,true);
                evt.removeListener(e.target.contentWindow.parent.document, 'mouseover', onInspectingMouseOver);
                
            }
            
            //e.target.addEventListener("mousemove",onInspectingMouseMove,true);
            evt.addListerner(e.target, "mousemove", onInspectingMouseMove);
            /* if(multi==={}){
            drawBox([{
            title:(e.target.tagName+(e.target.id?('#'+e.target.id):'')),
            css:style,
            x:x,
            y:y,
            w:w,
            h:h
            }
            ]);
            }else{
            drawBox([{
            title:(e.target.tagName+(e.target.id?('#'+e.target.id):'')),
            css:style,
            x:x,
            y:y,
            w:w,
            h:h
            },
            multi.drawArgs
            ]);
            } */
            
            if (multi.length === 0) {
                drawBox([e.target]);
            } else {
                drawBox(multi);
            }
            
            var frameOffset = getFrameOffset(e.target.ownerDocument.defaultView);
            
            setftBox((e.clientX + frameOffset.left), (e.clientY + frameOffset.top));
            ftBox.display = 'block';
            
        },
        getFrameOffset = function (winFrame, offset) {
            if (!offset) {
                offset = {
                    left : 0,
                    top : 0
                };
            }
            var tmp = Dom.getLTRBWH(winFrame.frameElement);
            if (winFrame.parent !== winFrame.parent.parent) {
                
                getFrameOffset(winFrame.parent, tmp);
            } else {
                return {
                    left : offset.left + tmp.left,
                    top : offset.top + tmp.top
                };
            }
        },
        
        show = function () {
            document = undefined;
            ready();
            //some text-align
            Components.utils.import("resource://gre/modules/FileUtils.jsm");
            Components.utils.import("resource://gre/modules/NetUtil.jsm");
            var file = FileUtils.getFile("ProfD", ["firetestie.json"]);
            if (!file.exists()) {
                file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0777);
            }
            var channel = NetUtil.newChannel(file);
            channel.contentType = "application/json";
            NetUtil.asyncFetch(channel, function (inputStream, status) {
                    var data = NetUtil.readInputStreamToString(inputStream, inputStream.available());
                    
                    match(data);
                    
                });
            log(match());
            
            var textWrapper = domplate({
                        mainWrapper : DIV({
                                style : 'margin:25px;'
                            }),
                        myTag :
                        DIV({
                                class : "MyDiv",
                                style : 'margin:25px;'
                            },
                            SPAN({
                                    style : 'font-weight:bold;font-size:24;'
                                }, "FireTestie"),
                            BR(),
                            SPAN("E")),
                        EnableBtn :
                        BUTTON({
                                type : 'button',
                                value : 'Disabled',
                                //disabled:"true",
                                onclick : '$onEnabledBtnClick'
                            },
                            "Toogle"),
                        onEnabledBtnClick : function (e) {
                            var target = e.target;
                            //target.disabled='true';
                            function lalala() {
                                log(this);
                            }
                            lalala.call(Firebug.Inspector.BoxModelHighlighter);
                            if (target.value === 'Enabled') {
                                ready();
                                target.setAttribute('value', 'Disabled');
                                alert('Inspector ON');
                            } else {
                                hide();
                                target.setAttribute('value', 'Enabled');
                                alert('Inspector OFF');
                            }
                            
                        },
                        
                        table :
                        TABLE({
                                style : 'border-collapse:collapse;border-spacing:0;margin-top:20px;',
                                className : 'ma',
                                width : "80%"
                            },
                            FOR("item", "array",
                                TAG("$row", {
                                        name : "$item"
                                    }))),
                        
                        row :
                        TR({
                                style : 'text-align:center'
                            },
                            TD("$name"),
                            TD("$name"))
                    });
            
            var panel = context.getPanel('FireTestie');
            //log(panel);
            var parentNode = panel.panelNode;
            var rootTemplateElement = textWrapper.mainWrapper.replace({}, parentNode, textWrapper);
            EnableBtnElement = textWrapper.EnableBtn.append(EnableBtnElement, rootTemplateElement, textWrapper);
            var la = match();
            matchTable = textWrapper.table.append({
                        array : la
                    }, rootTemplateElement, textWrapper);
            //log(EnableBtnElement);
            //Firebug.match="";
            var tableTmp = '<tr style="border-top:2px solid #000;">'+
                            '<th colspan="2" style="font-size:20px;'+
                            'font-weight:bold;">Firetestie.JSON</th>'+
                            '</tr>';
            
            for (var i in la) {
                tableTmp += ('<tr style="text-align:start;border-bottom:1px solid #333;">'+
                                '<td style="width:12%;border-right:1px dashed #333;'+
                                'padding-left:7px;padding-top:3px;padding-bottom:3px;">' + 
                                i + '</td><td style="padding-left:7px;padding-top:3px;padding-bottom:3px;">' + 
                                JSON.stringify(la[i]) + 
                                '</td>');
            }
            
            matchTable.innerHTML = tableTmp;
            
        },
        matchTable = null,
        match = function () {
            var obj = {};
            return function (param) {
                if (param instanceof window.Element) {
                    log(param);
                    var resule = false;
                    /* for(var tmp in obj){
                    if(tmp!=="style"){
                    if(param[tmp]!==obj[tmp]){
                    pass
                    }
                    
                    }
                    if()
                    } */
                    var style = param.ownerDocument.defaultView.getComputedStyle(param, null);
                    for (var testItem in obj) {
                        var itemName = testItem;
                        //log('项目'+itemName+'开始匹配');
                        var pass = true;
                        for (var attr in obj[itemName]) {
                            //log(style);
                            if (attr === 'style') {
                                for (var s in obj[itemName]['style']) {
                                    if (style[s] && style[s] !== obj[itemName]['style'][s]) {
                                        pass = false;
                                        break;
                                    }
                                }
                            } else {
                                
                                if (param[attr] && param[attr].toLowerCase() !== obj[itemName][attr].toLowerCase()) {
                                    pass = false;
                                    break;
                                }
                            }
                            
                        }
                        if (pass) {
                            return '[matched:' + itemName + ']';
                        } else {
                            continue;
                        }
                    }
                    return '';
                } else if (typeof param === 'string') {
                    log('STRING');
                    obj = JSON.parse(param);
                    log(obj);
                } else if (typeof param === 'undefined') {
                    return obj;
                }
            }
        }
        (),
        hide = function () {
            
            evt.removeAll();
            if (EnableBtnElement)
                EnableBtnElement.value = "Enabled";
            try {
                var pbox = document.getElementById('pbox');
                
                pbox && document.body.removeChild(pbox);
                document.body.removeChild(document.getElementById('xxxxdialog'));
            } catch (e) {};
            
            Firebug.Inspector.clearAllHighlights();
            document = undefined;
            readyTimeout = undefined;
            context = undefined;
            styleSheet = undefined;
            ftBox = undefined;
            tmpDoc = undefined;
            flag = false;
            isAlt = false;
            multi = [];
            isMulti = false;
            drawBox = function () {},
            windowX = 0;
            windowY = 0;
            
        };
        return {
            name : "FireTestie",
            title : "FireTestie",
            
            initialize : initialize,
            show : show,
            hide : hide,
        };
    }
    ());
    Firebug.registerPanel(fireTestiePanel);
    FireTestie.start = fireTestiePanel.show;
});
}});

 