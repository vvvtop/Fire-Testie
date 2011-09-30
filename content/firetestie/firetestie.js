var FireTestie = {};
var boxModelHighlighter = null;
var frameHighlighter = null;
var inspectDelay = 200;
const DEBUG = true;
var highlightCSS = "chrome://firebug/content/html/highlighter.css";

FBL.ns(function () {
        with (FBL) {
            
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
                        if (!element.addEventListener)
                            return;
                        element.addEventListener(type, callback, true);
                        list.push({
                                element : element,
                                callback : callback,
                                type : type
                            });
                    },
                    removeListener : function (element, type, callback) {
                        if (!element.addEventListener)
                            return;
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
                                var quickInfoBox = {
                                    boxEnabled : undefined,
                                    dragging : false,
                                    storedX : null,
                                    storedY : null,
                                    prevX : null,
                                    prevY : null,
                                    
                                    show : function (element) {
                                        if (!this.boxEnabled || !element)
                                            return;
                                        
                                        this.needsToHide = false;
                                        
                                        var vbox,
                                        lab,
                                        needsTitle = false,
                                        needsTitle2 = false,
                                        domAttribs = ['nodeName', 'id', 'name', 'offsetWidth', 'offsetHeight'],
                                        cssAttribs = ['position'],
                                        compAttribs = ['width', 'height', 'zIndex', 'position', 'top', 'right', 'bottom', 'left',
                                            'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'color', 'backgroundColor',
                                            'fontFamily', 'cssFloat', 'display', 'visibility'],
                                        qiBox = Firebug.chrome.$('fbQuickInfoPanel');
                                        
                                        if (qiBox.state === "closed") {
                                            qiBox.hidePopup();
                                            
                                            this.storedX = this.storedX || Firefox.getElementById('content').tabContainer.boxObject.screenX + 5;
                                            this.storedY = this.storedY || Firefox.getElementById('content').tabContainer.boxObject.screenY + 35;
                                            
                                            qiBox.openPopupAtScreen(this.storedX, this.storedY, false);
                                        }
                                        
                                        qiBox.removeChild(qiBox.firstChild);
                                        vbox = document.createElement("vbox");
                                        qiBox.appendChild(vbox);
                                        
                                        needsTitle = this.addRows(element, vbox, domAttribs);
                                        needsTitle2 = this.addRows(element.style, vbox, cssAttribs);
                                        
                                        if (needsTitle || needsTitle2) {
                                            lab = document.createElement("label");
                                            lab.setAttribute("class", "fbQuickInfoBoxTitle");
                                            lab.setAttribute("value", Locale.$STR("quickInfo"));
                                            vbox.insertBefore(lab, vbox.firstChild);
                                        }
                                        
                                        lab = document.createElement("label");
                                        lab.setAttribute("class", "fbQuickInfoBoxTitle");
                                        lab.setAttribute("value", Locale.$STR("computedStyle"));
                                        vbox.appendChild(lab);
                                        
                                        this.addRows(element, vbox, compAttribs, true);
                                    },
                                    
                                    hide : function () { // if mouse is over panel defer hiding to mouseout to not cause flickering
                                        if (this.mouseover || this.dragging) {
                                            this.needsToHide = true;
                                            return;
                                        }
                                        
                                        var qiBox = Firebug.chrome.$('fbQuickInfoPanel');
                                        this.prevX = null;
                                        this.prevY = null;
                                        this.needsToHide = false;
                                        qiBox.hidePopup();
                                    },
                                    
                                    handleEvent : function (event) {
                                        switch (event.type) {
                                        case "mousemove":
                                            if (!this.dragging)
                                                return;
                                            
                                            var diffX,
                                            diffY,
                                            boxX = this.qiBox.screenX,
                                            boxY = this.qiBox.screenY,
                                            x = event.screenX,
                                            y = event.screenY;
                                            
                                            diffX = x - this.prevX;
                                            diffY = y - this.prevY;
                                            
                                            this.qiBox.moveTo(boxX + diffX, boxY + diffY);
                                            
                                            this.prevX = x;
                                            this.prevY = y;
                                            this.storedX = boxX;
                                            this.storedY = boxY;
                                            break;
                                        case "mousedown":
                                            this.qiPanel = Firebug.chrome.$('fbQuickInfoPanel');
                                            this.qiBox = this.qiPanel.boxObject;
                                            this.qiPanel.addEventListener('mousemove', this, true);
                                            this.qiPanel.addEventListener('mouseup', this, true);
                                            this.dragging = true;
                                            this.prevX = event.screenX;
                                            this.prevY = event.screenY;
                                            break;
                                        case "mouseup":
                                            this.qiPanel.removeEventListener('mousemove', this, true);
                                            this.qiPanel.removeEventListener('mouseup', this, true);
                                            this.qiPanel = this.qiBox = null;
                                            this.prevX = this.prevY = null;
                                            this.dragging = false;
                                            break;
                                            // this is a hack to find when mouse enters and leaves panel
                                            // it requires that #fbQuickInfoPanel have border
                                        case "mouseover":
                                            if (this.dragging)
                                                return;
                                            this.mouseover = true;
                                            break;
                                        case "mouseout":
                                            if (this.dragging)
                                                return;
                                            this.mouseover = false;
                                            // if hiding was defered because mouse was over panel hide it
                                            if (this.needsToHide && event.target.nodeName == 'panel')
                                                this.hide();
                                            break;
                                        }
                                    },
                                    
                                    addRows : function (domBase, vbox, attribs, computedStyle) {
                                        if (!domBase)
                                            return;
                                        
                                        var i,
                                        cs,
                                        desc,
                                        hbox,
                                        lab,
                                        value,
                                        needsTitle = false,
                                        attribsLen = attribs.length;
                                        
                                        for (i = 0; i < attribsLen; i++) {
                                            if (computedStyle) {
                                                cs = getNonFrameBody(domBase).ownerDocument.defaultView.getComputedStyle(domBase, null);
                                                value = cs.getPropertyValue(attribs[i]);
                                                
                                                if (value && /rgb\(\d+,\s\d+,\s\d+\)/.test(value))
                                                    value = rgbToHex(value);
                                            } else
                                                value = domBase[attribs[i]];
                                            
                                            if (value) {
                                                needsTitle = true;
                                                hbox = document.createElement("hbox");
                                                lab = document.createElement("label");
                                                lab.setAttribute("class", "fbQuickInfoName");
                                                lab.setAttribute("value", attribs[i]);
                                                hbox.appendChild(lab);
                                                desc = document.createElement("description");
                                                desc.setAttribute("class", "fbQuickInfoValue");
                                                desc.appendChild(document.createTextNode(": " + value));
                                                hbox.appendChild(desc);
                                                vbox.appendChild(hbox);
                                            }
                                        }
                                        
                                        return needsTitle;
                                    }
                                };
                                function moveImp(element, x, y) {
                                    var css = 'left:' + x + 'px !important;top:' + y + 'px !important;';
                                    
                                    if (element)
                                        element.style.cssText = css;
                                    else
                                        return css;
                                }
                                function resizeImp(element, w, h) {
                                    var css = 'width:' + w + 'px !important;height:' + h + 'px !important;';
                                    
                                    if (element)
                                        element.style.cssText = css;
                                    else
                                        return css;
                                }
                                function getNonFrameBody(elt) {
                                    var body = Dom.getBody(elt.ownerDocument);
                                    return (body.localName && body.localName.toUpperCase() === "FRAMESET") ? null : body;
                                }
                                function pad(element, t, r, b, l) {
                                    var css = 'padding:' + Math.abs(t) + "px " + Math.abs(r) + "px "
                                         + Math.abs(b) + "px " + Math.abs(l) + "px !important;";
                                    
                                    if (element)
                                        element.style.cssText = css;
                                    else
                                        return css;
                                }
                                function attachStyles(context, body) {
                                    var doc = body.ownerDocument;
                                    if (!context.highlightStyle || context.highlightStyle.ownerDocument !== doc)
                                        context.highlightStyle = Css.createStyleSheet(doc, highlightCSS);
                                    
                                    if (!context.highlightStyle.parentNode || context.highlightStyle.ownerDocument != doc)
                                        Css.addStyleSheet(body.ownerDocument, context.highlightStyle);
                                }
                                Firebug.Inspector.BoxModelHighlighter.prototype.highlight = function (context, element, boxFrame, colorObj, isMulti) {
                                    var line,
                                    contentCssText,
                                    paddingCssText,
                                    borderCssText,
                                    marginCssText,
                                    nodes = this.getNodes(context, isMulti),
                                    highlightFrame = boxFrame ? nodes[boxFrame] : null;
                                    
                                    // if a single color was passed in lets use it as the content box color
                                    if (typeof colorObj === "string")
                                        colorObj = {
                                            content : colorObj,
                                            padding : "SlateBlue",
                                            border : "#444444",
                                            margin : "#EDFF64"
                                        };
                                    else
                                        colorObj = colorObj || {
                                                content : "SkyBlue",
                                                padding : "SlateBlue",
                                                border : "#444444",
                                                margin : "#EDFF64"
                                            };
                                    
                                    Firebug.Inspector.attachRepaintInspectListeners(element);
                                    storeHighlighterParams(this, context, element, boxFrame, colorObj, null, isMulti);
                                    
                                    if (context.highlightFrame)
                                        Css.removeClass(context.highlightFrame, "firebugHighlightBox");
                                    
                                    if (element.tagName !== "AREA") {
                                        this.ihl && this.ihl.show(false);
                                        
                                        quickInfoBox.show(element);
                                        context.highlightFrame = highlightFrame;
                                        
                                        if (highlightFrame) {
                                            Css.setClass(nodes.offset, "firebugHighlightGroup");
                                            Css.setClass(highlightFrame, "firebugHighlightBox");
                                        } else
                                            Css.removeClass(nodes.offset, "firebugHighlightGroup");
                                        
                                        var win = (element.ownerDocument ? element.ownerDocument.defaultView : null);
                                        if (!win)
                                            return;
                                        
                                        var style = win.getComputedStyle(element, "");
                                        if (!style) {
                                            if (FBTrace.DBG_INSPECT)
                                                FBTrace.sysout("highlight: no style for element " + element, element);
                                            return;
                                        }
                                        
                                        var styles = Css.readBoxStyles(style);
                                        var offset = Dom.getLTRBWH(element);
                                        var x = offset.left - Math.abs(styles.marginLeft);
                                        var y = offset.top - Math.abs(styles.marginTop);
                                        var w = offset.width - (styles.paddingLeft + styles.paddingRight + styles.borderLeft + styles.borderRight);
                                        var h = offset.height - (styles.paddingTop + styles.paddingBottom + styles.borderTop + styles.borderBottom);
                                        
                                        moveImp(nodes.offset, x, y);
                                        marginCssText = pad(null, styles.marginTop, styles.marginRight, styles.marginBottom, styles.marginLeft);
                                        borderCssText = pad(null, styles.borderTop, styles.borderRight, styles.borderBottom, styles.borderLeft);
                                        paddingCssText = pad(null, styles.paddingTop, styles.paddingRight, styles.paddingBottom, styles.paddingLeft);
                                        contentCssText = resizeImp(null, w, h);
                                        
                                        // element.tagName !== "BODY" for issue 2447. hopefully temporary, robc
                                        var showLines = Firebug.showRulers && boxFrame && element.tagName !== "BODY";
                                        if (showLines) {
                                            var offsetParent = element.offsetParent;
                                            
                                            if (offsetParent)
                                                this.setNodesByOffsetParent(win, offsetParent, nodes);
                                            
                                            var left = x;
                                            var top = y;
                                            var width = w - 1;
                                            var height = h - 1;
                                            
                                            if (boxFrame == "content") {
                                                left += Math.abs(styles.marginLeft) + Math.abs(styles.borderLeft)
                                                 + Math.abs(styles.paddingLeft);
                                                top += Math.abs(styles.marginTop) + Math.abs(styles.borderTop)
                                                 + Math.abs(styles.paddingTop);
                                            } else if (boxFrame == "padding") {
                                                left += Math.abs(styles.marginLeft) + Math.abs(styles.borderLeft);
                                                top += Math.abs(styles.marginTop) + Math.abs(styles.borderTop);
                                                width += Math.abs(styles.paddingLeft) + Math.abs(styles.paddingRight);
                                                height += Math.abs(styles.paddingTop) + Math.abs(styles.paddingBottom);
                                            } else if (boxFrame == "border") {
                                                left += Math.abs(styles.marginLeft);
                                                top += Math.abs(styles.marginTop);
                                                width += Math.abs(styles.paddingLeft) + Math.abs(styles.paddingRight)
                                                 + Math.abs(styles.borderLeft) + Math.abs(styles.borderRight);
                                                height += Math.abs(styles.paddingTop) + Math.abs(styles.paddingBottom)
                                                 + Math.abs(styles.borderTop) + Math.abs(styles.borderBottom);
                                            } else if (boxFrame == "margin") {
                                                width += Math.abs(styles.paddingLeft) + Math.abs(styles.paddingRight)
                                                 + Math.abs(styles.borderLeft) + Math.abs(styles.borderRight)
                                                 + Math.abs(styles.marginLeft) + Math.abs(styles.marginRight);
                                                height += Math.abs(styles.paddingTop) + Math.abs(styles.paddingBottom)
                                                 + Math.abs(styles.borderTop) + Math.abs(styles.borderBottom)
                                                 + Math.abs(styles.marginTop) + Math.abs(styles.marginBottom);
                                            }
                                            
                                            moveImp(nodes.lines.top, 0, top);
                                            moveImp(nodes.lines.right, left + width, 0);
                                            moveImp(nodes.lines.bottom, 0, top + height);
                                            moveImp(nodes.lines.left, left, 0)
                                        }
                                        
                                        var body = getNonFrameBody(element);
                                        if (!body)
                                            return this.unhighlight(context);
                                        
                                        if (colorObj.content)
                                            nodes.content.style.cssText = contentCssText + " background-color: " + colorObj.content + " !important;";
                                        else
                                            nodes.content.style.cssText = contentCssText + " background-color: #87CEEB !important;";
                                        
                                        if (colorObj.padding)
                                            nodes.padding.style.cssText = paddingCssText + " background-color: " + colorObj.padding + " !important;";
                                        else
                                            nodes.padding.style.cssText = paddingCssText + " background-color: #6A5ACD !important;";
                                        
                                        if (colorObj.border)
                                            nodes.border.style.cssText = borderCssText + " background-color: " + colorObj.border + " !important;";
                                        else
                                            nodes.border.style.cssText = borderCssText + " background-color: #444444 !important;";
                                        
                                        if (colorObj.margin)
                                            nodes.margin.style.cssText = marginCssText + " background-color: " + colorObj.margin + " !important;";
                                        else
                                            nodes.margin.style.cssText = marginCssText + " background-color: #EDFF64 !important;";
                                        
                                        var needsAppend = !nodes.offset.parentNode
                                             || nodes.offset.parentNode.ownerDocument != body.ownerDocument;
                                        
                                        if (needsAppend) {
                                            attachStyles(context, body);
                                            body.appendChild(nodes.offset);
                                        }
                                        
                                        if (showLines) {
                                            if (!nodes.lines.top.parentNode) {
                                                if (nodes.parent)
                                                    body.appendChild(nodes.parent);
                                                
                                                for (line in nodes.lines)
                                                    body.appendChild(nodes.lines[line]);
                                            }
                                        } else if (nodes.lines.top.parentNode) {
                                            if (nodes.parent)
                                                body.removeChild(nodes.parent);
                                            
                                            for (line in nodes.lines)
                                                body.removeChild(nodes.lines[line]);
                                        }
                                    } else {
                                        this.ihl = getImageMapHighlighter(context);
                                        this.ihl.highlight(element, true);
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
                                function rgbToHex(value) {
                                    return value.replace(/\brgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)/gi, function (_, r, g, b) {
                                            return '#' + ((1 << 24) + (r << 16) + (g << 8) + (b << 0)).toString(16).substr(-6).toUpperCase();
                                        });
                                }
                                var query,
                                
                                document,
                                
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
                                forceMatch,
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
                                        firetestieStop();
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
                                        function doDrawBox(args) {
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
                                                
                                                //styleSheet.innerHTML='dialog dialog h1,dialog h2,dialog h3,dialog h4,dialog h5,dialog h6,dialog p,dialog hr,dialog article,dialog aside,dialog section,dialog figure,dialog footer,dialog header,dialogdl,dialog dt,dialog dd,dialog ul,dialog ol,dialog li,dialog th,dialog td,dialogform,dialog fieldset,dialog input,dialog button,dialog textarea,dialog *{margin:0;padding:0;}dialog header,dialog nav,dialog footer,dialog wrapper,dialog csstable,dialog marginbox,dialog contentbox,dialog paddingbox,dialog borderbox,dialog section{display:block;}dialog button,dialog input,dialog select,dialog textarea{font:12px/1 Tahoma,Arial;}dialog button,dialog h1,dialog h2,dialog h3,dialog h4,dialog h5,dialog h6{font-size:100%;font:normal 12px Tahoma,Arial;}dialog li{list-style:none;}dialog button,dialog input,dialog select,dialog textarea{font-size:100%;border:none;background:none;}dialog input:focus,dialog textarea:focus{outline:none;}dialog fieldset,dialog img{border:0 none;}dialog img{vertical-align:middle;}dialog table{border:0 none !important;margin:0 !important;padding:border-collapse:collapse;border-spacing:0;}dialog q:before,dialog q:after{content:"";}dialog address,dialog cite,dialog em{font-style:normal;}dialog{z-index:2147483647;border:1px solid #eee;display:block;position:absolute;top:200px;left:200px;width:490px;height:auto;-moz-border-radius:3px;-moz-box-shadow:0 0 10px rgba(0,0,0,0.2);background:#ededed;margin:0;padding:0;text-align:start;color:#333;font-family:Arial;font-size:11px;}layout{position:relative;width:100%;width:284px;float:left;}dialog h1{margin:0;padding:0;color:#F47A24;font-size:22px;font-weight:bold;font-family:Arial;line-height:140%;text-indent:5px;border-bottom:1px dashed #d5d5d5;height:31px;text-align:left;background:#112;-moz-border-radius:3px 3px 0 0;border-radius:3px 3px 0 0;}csstable{font-size:11px;margin:7px auto auto 15px;border-right:1px dashed #d5d5d5;width:190px;float:left;}csstable tr{height:16px;}csstable .cssname{width:102px;font-weight:bold;}marginbox,contentbox,paddingbox,borderbox{margin:17px auto;}marginbox{width:200px;height:140px;border:1px dashed #000;}borderbox{width:150px;height:100px;border:1px dashed #000;}paddingbox{width:100px;height:60px;border:1px dashed #000;}contentbox{width:50px;height:20px;border:1px dashed #000;}.layout-figure{position:absolute;font-size:10px;}.figure_x{top:77px;}.figure_y{right:138px}.margin-left{right:219px;text-align:right;}.margin-right{left:220px;text-align:left;}.margin-top{top:24px;}.margin-bottom{top:136px;}.border-left{right:194px;text-align:right;}.border-right{left:194px;text-align:left;}.border-top{top:41px;}.border-bottom{top:114px;}.offset-left{right:245px;text-align:right;}.offset-right{left:245px;text-align:left;}.offset-top{top:6px;}.offset-bottom{top:158px;}.padding-left{right:170px;text-align:right;}.padding-right{left:170px;text-align:left;}.padding-top{top:60px;}.padding-bottom{top:94px;}.label-margin{top:19px;left:43px;}.label-border{top:38px;left:69px;}.label-padding{top:56px;left:95px;}.label-content{margin-top:4px;margin-left:auto;margin-right:auto;width:100%;hight:100%;display:block;text-align:center;}.label-offset{left:38px;top:5px;}';
                                                styleSheet.setAttribute('href', 'resource://firetestie_r/firetestie.css');
                                                styleSheet.setAttribute('rel', 'stylesheet');
                                                ftBox.appendChild(styleSheet);
                                                ftBox.style.display = 'none';
                                                document.body.appendChild(ftBox);
                                                
                                                //clear float
                                                clear.style.clear = 'both';
                                                //Firebug.Console.log(boxStyle);
                                                var matchResult = match(args[arg]);
                                                
                                                if (!!forceMatch) {
                                                    //ftBox.setAttribute('className','mod2');
                                                    var pass = true;
                                                    if (matchResult) {
                                                        cssTableInner += ('<tr><th class="cssname"></th><th>Element</th><th style="padding-left:20px;">Rule</th></tr>');
                                                        for (var ele in matchResult) {
                                                            var s = matchResult[ele]['status'];
                                                            if (pass) {
                                                                pass = s;
                                                            }
                                                            cssTableInner += ('<tr' + (!s ? ' style="background:#EF9C00;"' : '') + '><td class="cssname">' +
                                                                ele + '</td><td>' +
                                                                matchResult[ele]['org'] +
                                                                '</td><td style="padding-left:20px;">' + matchResult[ele]['match_rule'] +
                                                                '</td></tr>');
                                                        }
                                                    }
                                                    cssTableInner += '</tbody></table>';
                                                    ftBox.setAttribute('className', 'mod2');
                                                    
                                                    csstable.innerHTML = cssTableInner;
                                                    title.innerHTML = args[arg].tagName + (pass ? '<span class="match">' + forceMatch + '</span>' : '');
                                                    csstable.style.width = '300px';
                                                    csstable.children[0].style.width = '90%';
                                                    ftBox.appendChild(clear);
                                                } else {
                                                    ftBox.setAttribute('className', 'mod1');
                                                    ftBox.appendChild(layout);
                                                    ftBox.appendChild(clear);
                                                    
                                                    title.innerHTML = args[arg].tagName + '<span class="match">' + matchResult + '</span>' || 'N/A';
                                                    if (fontStyles) {
                                                        for (var ele in fontStyles) {
                                                            if (/rgb\(\d+,\s\d+,\s\d+\)/.test(fontStyles[ele])) {
                                                                fontStyles[ele] = rgbToHex(fontStyles[ele]);
                                                            }
                                                            cssTableInner += ('<tr><td class="cssname">' +
                                                                ele + '</td><td class="cssval"><div style="width:87px">' +
                                                                fontStyles[ele].replace(',', ',&nbsp;') +
                                                                '</div></td></tr>');
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
                                                }
                                                
                                                //ftBox=inner;
                                            }
                                            
                                        }
                                        return doDrawBox;
                                    }
                                    ();
                                    query = (function () {
                                            var d = document;
                                            d._Q_rev = 0;
                                            
                                            var MUTATION = false;
                                            var _onMu = function () {
                                                d._Q_rev++;
                                                MUTATION = true;
                                            };
                                            if (d.addEventListener) {
                                                d.addEventListener('DOMNodeInserted', _onMu, false);
                                                d.addEventListener('DOMNodeRemoved', _onMu, false);
                                            }
                                            
                                            var BY_ID1;
                                            var BY_CLASS;
                                            var IE678 = window.ActiveXObject && !d.addEventListener;
                                            (function () {
                                                    var div = d.createElement('div');
                                                    div.innerHTML = '<a name="d"></a><div id="d"></div>';
                                                    BY_ID1 = div.getElementsByTagName('*')["d"] === div.lastChild;
                                                    div.innerHTML = '<div class="t e"></div><div class="t"></div>';
                                                    div.lastChild.className = 'e';
                                                    BY_CLASS = div.getElementsByClassName && div.getElementsByClassName('e').length == 2;
                                                })();
                                            var BY_NAME = !!d.getElementsByName;
                                            var BY_ELEMENT = typeof d.documentElement.nextElementSibling !== 'undefined';
                                            var BY_CHILDREN = !!d.documentElement.children;
                                            var BY_CHILDREN_TAG = BY_CHILDREN && !!d.documentElement.children.tags;
                                            
                                            var PATTERN = /(?:\s*([ ~+>,])\s*)?(?:([:.#]?)((?:[\w\u00A1-\uFFFF-]|\\.)+|\*)|\[\s*((?:[\w\u00A1-\uFFFF-]|\\.)+)(?:\s*([~^$|*!]?=)\s*((['"]).*?\7|[^\]]*))?\s*\])/g;
                                            
                                            function trim(str) {
                                                return str.replace(/^\s*|\s*$/, '');
                                            }
                                            function make(kind, array) {
                                                return (array.kind = kind, array);
                                            }
                                            var parse = function () {
                                                var text;
                                                var index;
                                                
                                                function match(regex) {
                                                    var mc = (regex.lastIndex = index, regex.exec(text));
                                                    return mc && mc.index == index ? (index = regex.lastIndex, mc) : null;
                                                }
                                                function dequote(str) {
                                                    var ch = str.charAt(0);
                                                    return ch == '"' || ch == "'" ? str.slice(1, -1) : str;
                                                }
                                                function error() {
                                                    throw['ParseError', text, index];
                                                }
                                                
                                                function parse() {
                                                    var mc,
                                                    simple,
                                                    seq = [],
                                                    chain = [seq],
                                                    group = [chain];
                                                    while (mc = match(PATTERN)) {
                                                        if (mc[1]) {
                                                            if (mc[1] == ',')
                                                                group.push(chain = []);
                                                            if (seq.length)
                                                                chain.push(seq = []);
                                                            if (mc[1] != ',')
                                                                seq.comb = mc[1];
                                                        }
                                                        simple = [mc[4] || mc[3]];
                                                        if (mc[6])
                                                            simple.push(dequote(mc[6]));
                                                        simple.kind = mc[5] || (mc[4] ? '[' : mc[2] || 'T');
                                                        if (simple[0] == '*' && simple.kind != 'T')
                                                            error();
                                                        if (mc[2] == ':') {
                                                            simple.kind = ':' + mc[3];
                                                            if (text.charAt(index) == '(') {
                                                                index++;
                                                                if (mc[3] == 'not' || mc[3] == 'has') {
                                                                    var t = index;
                                                                    simple[0] = parse();
                                                                    simple[1] = text.slice(t, index);
                                                                    if (text.charAt(index) == ')')
                                                                        index++;
                                                                    else
                                                                        error();
                                                                } else {
                                                                    var tmpIndex = text.indexOf(')', index);
                                                                    if (tmpIndex != -1) {
                                                                        simple[0] = trim(text.slice(index, tmpIndex));
                                                                        index = tmpIndex + 1;
                                                                    } else
                                                                        error();
                                                                    
                                                                    if (mc[3].indexOf('nth') == 0) {
                                                                        var tmp = simple[0];
                                                                        tmp = (tmp == 'even' ? '2n' : tmp == 'odd' ? '2n+1' :
                                                                            (tmp.indexOf('n') == -1 ? '0n' : '') + tmp.replace(/\s*/g, '')).split('n');
                                                                        simple[0] = !tmp[0] ? 1 : Number(tmp[0]) | 0;
                                                                        simple[1] = Number(tmp[1]) | 0;
                                                                    } else if (mc[3] == 'contains') {
                                                                        simple[0] = dequote(simple[0]);
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        seq.push(simple);
                                                    }
                                                    return group;
                                                }
                                                
                                                return function (selector) {
                                                    return (text = selector, index = 0, selector = parse(), match(/\s*/g), index < text.length) ? error() : selector;
                                                };
                                                
                                            }
                                            ();
                                            
                                            var fRMap = {
                                                '#' : 9,
                                                'N' : BY_NAME ? 7 : 0,
                                                '.' : BY_CLASS ? 6 : 0,
                                                'T' : 5
                                            };
                                            var tRMap = {
                                                '#' : 9,
                                                '=' : 9,
                                                '[' : 8,
                                                'N' : 9,
                                                'T' : 8,
                                                '.' : 5,
                                                '~=' : 3,
                                                '|=' : 3,
                                                '*=' : 3,
                                                ':not' : 6,
                                                ':has' : 1,
                                                ':contains' : 3,
                                                ':nth-child' : 2,
                                                ':nth-last-child' : 2,
                                                ':first-child' : 3,
                                                ':last-child' : 3,
                                                ':only-child' : 3,
                                                ':not-ex' : 7
                                            };
                                            var efMap = {
                                                id : '#',
                                                name : 'N'
                                            };
                                            var testingOrder = function (a, b) {
                                                return a.tR - b.tR;
                                            };
                                            var regPos = /:(nth|eq|gt|lt|first|last|even|odd)$/;
                                            
                                            function process(seq) {
                                                var finder,
                                                t;
                                                var k = seq.length;
                                                while (k--) {
                                                    var simple = seq[k];
                                                    // 转化[id="xxx"][name="xxx"][tagName="xxx"][className~="xxx"]之类的选择器
                                                    // 识别:root,html|head|body|title等全局仅一个的标签的选择器，忽略*选择器
                                                    // 合并类选择器以便于使用getElementsByClassName
                                                    if (simple.kind == ':html')
                                                        simple = make('T', 'html');
                                                    if (simple.kind == '=') {
                                                        if (efMap[simple[0]])
                                                            simple = make(efMap[simple[0]], [simple[1]]);
                                                    } else if (simple.kind == '~=' && simple[0] == 'className')
                                                        simple = make('.', [simple[1]]);
                                                    if (simple.kind == 'T') {
                                                        if (simple[0] == '*')
                                                            simple.kind = '*';
                                                        else
                                                            seq.tag = simple;
                                                        t = simple[0].toLowerCase();
                                                    } else if (simple.kind == '.') {
                                                        if (!seq.classes)
                                                            seq.classes = simple;
                                                        else {
                                                            seq.classes.push(simple[0]);
                                                            simple.kind = '*';
                                                        }
                                                    }
                                                    if (simple.kind == ':not' && !((t = simple[0], t.length == 1) && (t = t[0], t.length == 1))) {
                                                        simple.kind = ':not-ex';
                                                    }
                                                    //remark: 这里是为了支持sizzle的setFilter系列
                                                    if (regPos.test(simple.kind)) {
                                                        simple[0] = Number(simple[0]) | 0;
                                                        var newSimple = make(simple.kind, simple.slice(0));
                                                        simple.kind = '*';
                                                        if (!seq.allPoses) {
                                                            seq.allPoses = [newSimple];
                                                        } else {
                                                            seq.allPoses.push(newSimple);
                                                        }
                                                    }
                                                    // 计算选择器的得分用于优先级排序等策略
                                                    simple.fR = fRMap[simple.kind] | 0;
                                                    simple.tR = tRMap[simple.kind] | 0;
                                                    if (simple.fR && (!finder || simple.fR > finder.fR))
                                                        finder = simple;
                                                    seq[k] = simple;
                                                }
                                                // 按照优先级对用于测试的选择器进行排序
                                                seq.sort(testingOrder);
                                                // 记录用于getElementXXX的最佳的选择器
                                                seq.$ = finder;
                                                return seq;
                                            }
                                            // 对chain进行处理
                                            // 注意为了处理方便, 返回的数组是倒序的
                                            // div p a => [div] [p] [a]
                                            // div p>a => [div] [p>a]
                                            function slice(chain) {
                                                var part = [];
                                                var parts = [part];
                                                var k = chain.length;
                                                while (k--) {
                                                    var seq = chain[k];
                                                    seq = process(seq);
                                                    seq.N = 'node' + k;
                                                    //remark: 这里是为了支持sizzle的setFilter.
                                                    if (seq.allPoses) {
                                                        if (!chain.allPoses) {
                                                            chain.allPoses = [];
                                                        }
                                                        chain.allPoses.push.apply(chain.allPoses, seq.allPoses);
                                                    }
                                                    if (seq.$ && (!part.fR || seq.$.fR > part.fR || (seq.$.fR == part.fR && parts.length == 1))) {
                                                        part.fR = seq.$.fR;
                                                        part.fI = part.length;
                                                    }
                                                    part.push(seq);
                                                    if (seq.comb == ' ' && k && part.fI != null) {
                                                        parts.push(part = []);
                                                        part.fR = 0;
                                                    }
                                                    if (k == chain.length - 1 && seq.tag)
                                                        chain.tag = seq.tag;
                                                }
                                                for (var i = 0; i < parts.length; i++) {
                                                    part = parts[i];
                                                    var part1 = parts[i + 1];
                                                    if (part1 != null) {
                                                        if (part.fR > part1.fR || (part.fR == part1.fR && part1.fI != 0)) {
                                                            parts.splice(i + 1, 1);
                                                            part.push.apply(part, part1);
                                                            i--;
                                                        } else {
                                                            part.R = part1[0].N;
                                                        }
                                                    } else {
                                                        part.R = 'root';
                                                    }
                                                }
                                                // 如果没有找到任何一个可以用于find的seq.
                                                if (parts[0].fI == null) {
                                                    parts[0].fI = 0;
                                                    parts[0][0].$ = make('*', ['*']);
                                                }
                                                return parts;
                                            }
                                            
                                            function format(tpl, params) {
                                                return tpl.replace(/#\{([^}]+)\}/g, function (m, p) {
                                                        return params[p] == null ? m : params[p] + '';
                                                    });
                                            }
                                            
                                            var CTX_NGEN = 0;
                                            
                                            var TPL_DOC = '/*^var doc=root.ownerDocument||root;^*/';
                                            var TPL_XHTML = TPL_DOC + '/*^var xhtml=Q._isXHTML(doc);^*/';
                                            var TPL_CONTAINS = IE678 ? '#{0}.contains(#{1})' : '#{0}.compareDocumentPosition(#{1})&16';
                                            var TPL_QID = '#{N}._Q_id||(#{N}._Q_id=++qid)';
                                            var TPL_FIND = {
                                                '#' : 'var #{N}=Q._byId("#{P}", #{R});if(#{N}){#{X}}',
                                                'N' : TPL_DOC + 'var #{N}A=doc.getElementsByName("#{P}");for(var #{N}I=0,#{N};#{N}=#{N}A[#{N}I];#{N}I++){if(#{R}===doc||' + format(TPL_CONTAINS, ['#{R}', '#{N}']) + '){#{X}}}',
                                                'T' : 'var #{N}A=#{R}.getElementsByTagName("#{P}");for(var #{N}I=0,#{N};#{N}=#{N}A[#{N}I];#{N}I++){#{X}}',
                                                '.' : 'var #{N}A=#{R}.getElementsByClassName("#{P}");for(var #{N}I=0,#{N};#{N}=#{N}A[#{N}I];#{N}I++){#{X}}',
                                                '*' : 'var #{N}A=#{R}.getElementsByTagName("*");for(var #{N}I=0,#{N};#{N}=#{N}A[#{N}I];#{N}I++){#{X}}',
                                                '+' : BY_ELEMENT ? '/*^var #{N};^*/if(#{N}=#{R}.nextElementSibling){#{X}}' : 'var #{N}=#{R};while(#{N}=#{N}.nextSibling){if(#{N}.nodeType==1){#{X}break;}}',
                                                '~' : BY_ELEMENT ? '/*^var #{N}H={};^*/var #{N}=#{R};while(#{N}=#{N}.nextElementSibling){if(#{N}H[' + TPL_QID + '])break;#{N}H[' + TPL_QID + ']=1;#{X}}' : '/*^var #{N}H={};^*/var #{N}=#{R};while(#{N}=#{N}.nextSibling){if(#{N}.nodeType==1){if(#{N}H[' + TPL_QID + '])break;#{N}H[' + TPL_QID + ']=1;#{X}}}',
                                                '>' : 'var #{N}A=#{R}.children||#{R}.childNodes;for(var #{N}I=0,#{N};#{N}=#{N}A[#{N}I];#{N}I++){if(#{N}.nodeType==1){#{X}}}',
                                                '>T' : 'var #{N}A=#{R}.children.tags("#{P}");for(var #{N}I=0,#{N};#{N}=#{N}A[#{N}I];#{N}I++){#{X}}'
                                            };
                                            var TPL_LEFT = 'var #{R}V={_:false};NP_#{R}:{P_#{R}:{#{X}break NP_#{R};}#{R}V._=true;#{Y}}';
                                            var TPL_TOPASS = 'if(t=#{N}H[' + TPL_QID + ']){if(t._){break P_#{R};}else{break NP_#{R};}}#{N}H[' + TPL_QID + ']=#{R}V;#{X}';
                                            var TPL_TOPASS_UP = format(TPL_TOPASS, {
                                                        X : 'if(#{N}!==#{R}){#{X}}'
                                                    });
                                            var TPL_PASSED = 'break P_#{R};';
                                            var TPL_PASS = {
                                                '>' : '/*^var #{N}H={};^*/var #{N}=#{C}.parentNode;' + TPL_TOPASS_UP,
                                                ' ' : '/*^var #{N}H={};^*/var #{N}=#{C};while(#{N}=#{N}.parentNode){' + TPL_TOPASS_UP + '}',
                                                '+' : BY_ELEMENT ? '/*^var #{N}H={};var #{N};^*/if(#{N}=#{C}.previousElementSibling){#{X}}' : '/*^var #{N}H={};^*/var #{N}=#{C};while(#{N}=#{N}.previousSibling){#{X}break;}',
                                                '~' : BY_ELEMENT ? '/*^var #{N}H={};^*/var #{N}=#{C};while(#{N}=#{N}.previousElementSibling){' + TPL_TOPASS + '}' : '/*^var #{N}H={};^*/var #{N}=#{C};while(#{N}=#{N}.previousSibling){' + TPL_TOPASS + '}'
                                            };
                                            var TPL_MAIN = 'function(root){var result=[];var qid=Q.qid,t,l=result.length;BQ:{#{X}}Q.qid=qid;return result;}';
                                            var TPL_HELP = '/*^var #{N}L;^*/if(!#{N}L||!(' + format(TPL_CONTAINS, ['#{N}L', '#{N}']) + ')){#{X}#{N}L=#{N};}';
                                            var TPL_PUSH = 'result[l++]=#{N};';
                                            var TPL_INPUT_T = TPL_XHTML + '/*^var input_t=!xhtml?"INPUT":"input";^*/';
                                            var TPL_POS = '/*^var pos=-1;^*/';
                                            var TPL_TEST = {
                                                'T' : TPL_XHTML + '/*^var #{N}T=!xhtml?("#{0}").toUpperCase():"#{0}";^*/#{N}.nodeName==#{N}T',
                                                '#' : '#{N}.id=="#{0}"',
                                                'N' : '#{N}.name=="#{0}"',
                                                
                                                '[' : IE678 ? '(t=#{N}.getAttributeNode("#{0}"))&&(t.specified)' : '#{N}.hasAttribute("#{0}")',
                                                '=' : '#{A}=="#{1}"',
                                                '!=' : '#{A}!="#{1}"',
                                                '^=' : '(t=#{A})&&t.slice(0,#{L})=="#{1}"',
                                                '$=' : '(t=#{A})&&t.slice(-#{L})=="#{1}"',
                                                '*=' : '(t=#{A})&&t.indexOf("#{1}")!==-1',
                                                '|=' : '(t=#{A})&&(t=="#{1}"||t.slice(0,#{L})=="#{P}")',
                                                '~=' : '(t=#{A})&&(" "+t+" ").indexOf("#{P}")!==-1',
                                                
                                                ':element' : '#{N}.nodeType==1',
                                                ':contains' : '(#{N}.textContent||#{N}.innerText).indexOf("#{0}")!==-1',
                                                ':first-child' : BY_ELEMENT ? '#{N}.parentNode.firstElementChild===#{N}' : 'Q._isFirstChild(#{N})',
                                                ':nth-child' : TPL_DOC + '/*^var rev=doc._Q_rev||(doc._Q_rev=Q.qid++);^*/Q._index(#{N},#{0},#{1},rev)',
                                                ':last-child' : BY_ELEMENT ? '#{N}.parentNode.lastElementChild===#{N}' : 'Q._isLastChild(#{N})',
                                                ':only-child' : BY_ELEMENT ? '(t=#{N}.parentNode)&&(t.firstElementChild===#{N}&&t.lastElementChild===#{N})' : 'Q._isOnlyChild(#{N})',
                                                
                                                ':not-ex' : '/*^var _#{G}=Q._hash(Q("#{1}",root));qid=Q.qid;^*/!_#{G}[' + TPL_QID + ']',
                                                ':has' : '(t=Q("#{1}", #{N}),qid=Q.qid,t.length>0)',
                                                ':parent' : '!!#{N}.firstChild',
                                                ':empty' : '!#{N}.firstChild',
                                                
                                                ':header' : '/h\\d/i.test(#{N}.nodeName)',
                                                ':input' : '/input|select|textarea|button/i.test(#{N}.nodeName)',
                                                ':enabled' : '#{N}.disabled===false&&#{N}.type!=="hidden"',
                                                ':disabled' : '#{N}.disabled===true',
                                                ':checked' : '#{N}.checked===true',
                                                ':selected' : '(#{N}.parentNode.selectedIndex,#{N}.selected===true)',
                                                
                                                // TODO: 这些伪类可以转化成为标签选择器加以优化！
                                                ':focus' : TPL_DOC + '#{N}===doc.activeElement',
                                                ':button' : TPL_INPUT_T + '#{N}.nodeName==="button"||(#{N}.nodeName===input_t&&#{N}.type==="button")',
                                                ':submit' : TPL_INPUT_T + '#{N}.nodeName===input_t&&#{N}.type==="submit"',
                                                ':reset' : TPL_INPUT_T + '#{N}.nodeName===input_t&&#{N}.type==="reset"',
                                                ':text' : TPL_INPUT_T + '#{N}.nodeName===input_t&&#{N}.type==="text"&&(t=#{N}.getAttribute("type"),t==="text"||t===null)',
                                                ':radio' : TPL_INPUT_T + '#{N}.nodeName===input_t&&#{N}.type==="radio"',
                                                ':checkbox' : TPL_INPUT_T + '#{N}.nodeName===input_t&&#{N}.type==="checkbox"',
                                                ':file' : TPL_INPUT_T + '#{N}.nodeName===input_t&&#{N}.type==="file"',
                                                ':password' : TPL_INPUT_T + '#{N}.nodeName===input_t&&#{N}.type==="password"',
                                                ':image' : TPL_INPUT_T + '#{N}.nodeName===input_t&&#{N}.type==="image"'
                                            };
                                            
                                            function genAttrCode(attr) {
                                                if (attr == 'for')
                                                    return '#{N}.htmlFor';
                                                if (attr == 'class')
                                                    return '#{N}.className';
                                                if (attr == 'type')
                                                    return '#{N}.getAttribute("type")';
                                                if (attr == 'href')
                                                    return '#{N}.getAttribute("href",2)';
                                                return '(#{N}["' + attr + '"]||#{N}.getAttribute("' + attr + '"))';
                                            }
                                            
                                            function genTestCode(simple) {
                                                if (simple.kind.indexOf('=') !== -1) {
                                                    simple.A = genAttrCode(simple[0]);
                                                }
                                                var t;
                                                switch (simple.kind) {
                                                case '.':
                                                    var k = simple.length;
                                                    var buff = [];
                                                    while (k--) {
                                                        buff.push('t.indexOf(" #{' + k + '} ")!==-1');
                                                    }
                                                    return format('(t=#{N}.className)&&((t=" "+t+" "),(' + buff.join(' && ') + '))', simple);
                                                case '^=':
                                                case '$=':
                                                    simple.L = simple[1].length;
                                                    break;
                                                case '|=':
                                                    simple.L = simple[1].length + 1;
                                                    simple.P = simple[1] + '-';
                                                    break;
                                                case '~=':
                                                    simple.P = ' ' + simple[1] + ' ';
                                                    break;
                                                case ':nth-child':
                                                    //        case ':nth-last-child':
                                                    if (simple[0] == 1 && simple[1] == 0)
                                                        return '';
                                                    break;
                                                case ':not':
                                                    t = genCondCode(simple[0][0][0]);
                                                    return t ? '!(' + t + ')' : 'false';
                                                case ':not-ex':
                                                case ':has':
                                                    simple.G = CTX_NGEN++;
                                                    break;
                                                case '*':
                                                    return '';
                                                }
                                                return format(TPL_TEST[simple.kind], simple);
                                            }
                                            function genCondCode(seq) {
                                                var buff = [];
                                                var k = seq.length;
                                                var code;
                                                while (k--) {
                                                    var simple = seq[k];
                                                    if (code = genTestCode(simple)) {
                                                        buff.push(code);
                                                    }
                                                }
                                                return buff.join(' && ');
                                            }
                                            function genThenCode(seq) {
                                                var code = genCondCode(seq);
                                                return code ? format('if(' + code + '){#{X}}', {
                                                        N : seq.N
                                                    }) : '#{X}';
                                            }
                                            var NEEDNOT_ELEMENT_CHECK = {
                                                '#' : 1,
                                                'T' : 1,
                                                '.' : 1,
                                                'N' : 1,
                                                ':element' : 1
                                            };
                                            function genFindCode(seq, R, comb) {
                                                comb = comb || seq.comb;
                                                var tpl;
                                                if (comb == ' ') {
                                                    var finder = seq.$;
                                                    if (finder) {
                                                        tpl = TPL_FIND[finder.kind];
                                                        // 有hack的嫌疑, 让产生test代码时忽略已经用于find的seq.
                                                        finder.kind = '*';
                                                    } else {
                                                        tpl = TPL_FIND['*'];
                                                        if (IE678 && !NEEDNOT_ELEMENT_CHECK[seq[seq.length - 1].kind]) {
                                                            seq.push(make(':element', []));
                                                        }
                                                    }
                                                } else if (BY_CHILDREN_TAG && comb == '>' && seq.tag) {
                                                    tpl = TPL_FIND['>T'];
                                                    finder = seq.tag;
                                                    seq.tag.kind = '*';
                                                } else {
                                                    //            if (!BY_ELEMENT && (comb == '+' || comb == '~') && !NEEDNOT_ELEMENT_CHECK[seq[seq.length - 1].kind]) {
                                                    //                seq.push(make(':element', []));
                                                    //            }
                                                    tpl = TPL_FIND[comb];
                                                }
                                                return format(tpl, {
                                                        P : finder && (finder.kind == '.' ? finder.join(' ') : finder[0]),
                                                        N : seq.N,
                                                        R : R,
                                                        X : genThenCode(seq)
                                                    });
                                            }
                                            function genNextCode(part, thenCode) {
                                                var code = '#{X}';
                                                var k = part.fI;
                                                while (k--) {
                                                    code = format(code, {
                                                                X : genFindCode(part[k], part[k + 1].N)
                                                            });
                                                }
                                                var nextCode;
                                                if (!thenCode) {
                                                    if (part.fI == 0 && (k = part[0].$.kind) && (k != 'S' && k != '#')) {
                                                        nextCode = format(TPL_HELP, {
                                                                    N : part[0].N
                                                                });
                                                        code = format(code, {
                                                                    X : nextCode
                                                                })
                                                    }
                                                } else {
                                                    nextCode = format(thenCode, {
                                                                N : part[0].N
                                                            });
                                                    code = format(code, {
                                                                X : nextCode
                                                            });
                                                }
                                                return code;
                                            }
                                            function genPassCode(seq, C, comb) {
                                                return format(TPL_PASS[comb], {
                                                        N : seq.N,
                                                        C : C,
                                                        X : genThenCode(seq)
                                                    });
                                            }
                                            function genLeftCode(part) {
                                                var code = TPL_LEFT;
                                                for (var i = part.fI + 1, l = part.length; i < l; i++) {
                                                    var seq = part[i];
                                                    var lastSeq = part[i - 1];
                                                    code = format(code, {
                                                                X : genPassCode(seq, lastSeq.N, part[i - 1].comb)
                                                            });
                                                }
                                                code = format(code, {
                                                            X : TPL_PASSED
                                                        });
                                                code = format(code, {
                                                            R : part.R
                                                        });
                                                return code;
                                            }
                                            function genPartCode(part, thenCode) {
                                                var code = genFindCode(part[part.fI], part.R, ' ');
                                                var nextCode = genNextCode(part, thenCode);
                                                if (part.fI < part.length - 1) {
                                                    var passCode = genLeftCode(part);
                                                    nextCode = format(passCode, {
                                                                Y : nextCode
                                                            });
                                                }
                                                return format(code, {
                                                        X : nextCode
                                                    });
                                            }
                                            
                                            function genThatCode(seq) {
                                                var obj = {};
                                                var k = seq.length;
                                                while (k--) {
                                                    var simple = seq[k];
                                                    if (simple.kind == ':first') {
                                                        simple = make(':nth', [0]);
                                                    } else if (simple.kind == ':last') {
                                                        obj.last = 1;
                                                    }
                                                    if (simple.kind == ':lt') {
                                                        obj.lt = obj.lt === undefined ? simple[0] : Math.min(obj.lt, simple[0]);
                                                    } else if (simple.kind == ':gt') {
                                                        obj.gt = obj.gt === undefined ? simple[0] : Math.max(obj.gt, simple[0]);
                                                    } else if (simple.kind == ':eq' || simple.kind == ':nth') {
                                                        if (obj.eq && obj.eq !== simple[0]) {
                                                            obj.no = true;
                                                        } else
                                                            obj.eq = simple[0];
                                                    } else if (simple.kind == ':even' || simple.kind == ':odd') {
                                                        obj[simple.kind.slice(1)] = 1;
                                                    }
                                                }
                                                if ((obj.lt != null && obj.eq != null && obj.eq >= obj.lt) || (obj.lt != null && obj.gt != null && obj.lt <= obj.gt) || (obj.even && obj.odd)) {
                                                    obj.no = 1;
                                                }
                                                
                                                if (obj.no) {
                                                    return '/*^break BQ;^*/';
                                                }
                                                var buff = [];
                                                if (obj.even) {
                                                    buff.push('pos%2===0');
                                                } else if (obj.odd) {
                                                    buff.push('pos%2===1');
                                                }
                                                var code = obj.eq == null ? TPL_PUSH : 'if(pos===' + obj.eq + '){result=[#{N}];break BQ;}';
                                                if (obj.gt != null) {
                                                    buff.push('pos>' + obj.gt);
                                                }
                                                code = buff.length ? 'if (' + buff.join('&&') + '){' + code + '}' : code;
                                                code = obj.lt != null ? 'if (pos<' + obj.lt + '){' + code + '}else break BQ;' : code;
                                                if (obj.last) {
                                                    code += '/*$result=result.slice(-1);$*/';
                                                }
                                                return code;
                                            }
                                            function genCode(chain) {
                                                var parts = slice(chain);
                                                
                                                var thenCode = chain.allPoses ? TPL_POS + 'pos++;' + genThatCode(chain.allPoses) : TPL_PUSH;
                                                CTX_NGEN = 0;
                                                var code = '#{X}';
                                                
                                                var k = parts.length;
                                                while (k--) {
                                                    var part = parts[k];
                                                    code = format(code, {
                                                                X : genPartCode(part, k == 0 ? thenCode : false)
                                                            });
                                                }
                                                return code;
                                            }
                                            
                                            var documentOrder;
                                            if (d.documentElement.sourceIndex) {
                                                documentOrder = function (nodeA, nodeB) {
                                                    return nodeA === nodeB ? 0 : nodeA.sourceIndex - nodeB.sourceIndex;
                                                };
                                            } else if (d.compareDocumentPosition) {
                                                documentOrder = function (nodeA, nodeB) {
                                                    return nodeA === nodeB ? 0 : nodeB.compareDocumentPosition(nodeA) & 0x02 ? -1 : 1;
                                                };
                                            }
                                            function uniqueSort(nodeSet, notUnique) {
                                                if (!nodeSet.length)
                                                    return nodeSet;
                                                nodeSet.sort(documentOrder);
                                                if (notUnique)
                                                    return nodeSet;
                                                var resultSet = [nodeSet[0]];
                                                var node,
                                                j = 0;
                                                for (var i = 1, l = nodeSet.length; i < l; i++) {
                                                    if (resultSet[j] !== (node = nodeSet[i])) {
                                                        resultSet[++j] = node;
                                                    }
                                                }
                                                return resultSet;
                                            }
                                            
                                            function compile(expr) {
                                                var group = parse(expr);
                                                var tags = {};
                                                var k = group.length;
                                                while (k--) {
                                                    var chain = group[k];
                                                    var code = genCode(chain);
                                                    if (tags && chain.tag && !tags[chain.tag[0]]) {
                                                        tags[chain.tag[0]] = 1;
                                                    } else {
                                                        tags = null;
                                                    }
                                                    var hash = {};
                                                    var pres = [];
                                                    var posts = [];
                                                    code = code.replace(/\/\*\^(.*?)\^\*\//g, function (m, p) {
                                                                return (hash[p] || (hash[p] = pres.push(p)), '');
                                                            });
                                                    code = code.replace(/\/\*\$(.*?)\$\*\//g, function (m, p) {
                                                                return (hash[p] || (hash[p] = posts.push(p)), '');
                                                            });
                                                    code = format(TPL_MAIN, {
                                                                X : pres.join('') + code + posts.join('')
                                                            });
                                                    group[k] = new Function('Q', 'return(' + code + ')')(Q);
                                                }
                                                if (group.length == 1) {
                                                    return group[0];
                                                }
                                                return function (root) {
                                                    var k = group.length;
                                                    var result = [];
                                                    while (k--) {
                                                        result.push.apply(result, group[k](root));
                                                    }
                                                    return uniqueSort(result, tags != null);
                                                };
                                            }
                                            
                                            Q._hash = function (result) {
                                                var hash = result._Q_hash;
                                                if (hash == null) {
                                                    hash = result._Q_hash = {};
                                                    var k = result.length;
                                                    var qid = Q.qid;
                                                    while (k--) {
                                                        var el = result[k];
                                                        hash[el._Q_id || (el._Q_id = ++qid)] = 1;
                                                    }
                                                    Q.qid = qid;
                                                }
                                                return hash;
                                            };
                                            var _slice = Array.prototype.slice;
                                            Q._toArray1 = function (staticNodeList) {
                                                var k = staticNodeList.length;
                                                var a = new Array(k);
                                                while (k--) {
                                                    a[k] = staticNodeList[k];
                                                }
                                                return a;
                                            };
                                            Q._toArray = function (staticNodeList) {
                                                try {
                                                    return _slice.call(staticNodeList, 0);
                                                } catch (ex) {}
                                                return (Q._toArray = Q._toArray1)(staticNodeList);
                                            };
                                            
                                            function queryXML(expr, root) {
                                                throw['NotImpl'];
                                            }
                                            var cache = {};
                                            var inQuery = false;
                                            function query(expr, root) {
                                                var doc = root.ownerDocument || root;
                                                var ret;
                                                if (!doc.getElementById) {
                                                    return queryXML(expr, root);
                                                }
                                                if (root === doc && doc.querySelectorAll && !/#/.test(expr)) {
                                                    try {
                                                        return Q._toArray(doc.querySelectorAll(expr));
                                                    } catch (ex) {}
                                                }
                                                var fn = cache[expr] || (cache[expr] = compile(expr));
                                                if (!inQuery) {
                                                    inQuery = true;
                                                    if (!MUTATION) {
                                                        doc._Q_rev = Q.qid++;
                                                    }
                                                    ret = fn(root);
                                                    inQuery = false;
                                                } else {
                                                    ret = fn(root);
                                                }
                                                return ret;
                                            }
                                            
                                            Q.qid = 1;
                                            Q._byId = function (id, root) {
                                                if (BY_ID1) {
                                                    return root.getElementsByTagName('*')[id];
                                                }
                                                var doc = root.ownerDocument || root;
                                                var node = doc.getElementById(id);
                                                if (node && ((root === doc) || Q.contains(root, node)) && (!IE678 || (node.id === id || node.getAttributeNode('id').nodeValue === id))) {
                                                    return node;
                                                }
                                                return null;
                                            };
                                            Q._in = function (nodes, nodeSet) {
                                                var hash = Q._hash(nodeSet);
                                                var ret = [];
                                                for (var i = 0; i < nodes.length; i++) {
                                                    var node = nodes[i];
                                                    if (hash[node._Q_id || (node._Q_id = ++Q.qid)]) {
                                                        ret.push(node);
                                                    }
                                                }
                                                return ret;
                                            };
                                            Q.matches = function (expr, set) {
                                                return Q(expr, null, null, set);
                                            };
                                            Q.contains = d.documentElement.contains ? function (a, b) {
                                                return a !== b && a.contains(b);
                                            }
                                             : function (a, b) {
                                                return a !== b && a.compareDocumentPosition(b) & 16;
                                            };
                                            Q._has = function (node, nodes) {
                                                for (var i = 0, tnode; tnode = nodes[i++]; ) {
                                                    if (!Q.contains(node, tnode))
                                                        return false;
                                                }
                                                return true;
                                            };
                                            Q._index = function (node, a, b, rev) {
                                                var parent = node.parentNode;
                                                if (parent._Q_magic !== rev) {
                                                    var tnode;
                                                    var count = 1;
                                                    if (BY_ELEMENT) {
                                                        tnode = parent.firstElementChild;
                                                        while (tnode) {
                                                            tnode._Q_index = count++;
                                                            tnode = tnode.nextElementSibling;
                                                        }
                                                    } else {
                                                        var nodes = parent.children || parent.childNodes;
                                                        for (var i = 0; tnode = nodes[i]; i++) {
                                                            if (tnode.nodeType == 1) {
                                                                tnode._Q_index = count++;
                                                            }
                                                            tnode = tnode.nextSibling;
                                                        }
                                                    }
                                                    parent._Q_count1 = count;
                                                    parent._Q_magic = rev;
                                                }
                                                return a ? (node._Q_index - b) % a == 0 : node._Q_index == b;
                                            };
                                            Q._isOnlyChild = function (node) {
                                                return Q._isFirstChild(node) && Q._isLastChild(node);
                                            };
                                            Q._isFirstChild = function (node) {
                                                while (node = node.previousSibling) {
                                                    if (node.nodeType == 1)
                                                        return false;
                                                }
                                                return true;
                                            };
                                            Q._isLastChild = function (node) {
                                                while (node = node.nextSibling) {
                                                    if (node.nodeType == 1)
                                                        return false;
                                                }
                                                return true;
                                            };
                                            Q._isXHTML = function (doc) {
                                                return doc.documentElement.nodeName == 'html';
                                            };
                                            function Q(expr, root, result, seed) {
                                                root = root || d;
                                                var ret = query(expr, root);
                                                if (seed) {
                                                    ret = Q._in(seed, ret);
                                                }
                                                if (result) {
                                                    ret.push.apply(result, ret);
                                                } else {
                                                    result = ret;
                                                }
                                                return result;
                                            }
                                            return Q;
                                        })();
                                },
                                styleNames = {
                                    'font-family' : ['fontFamily', true],
                                    'font-size' : ['fontSize', true],
                                    'font-weight' : ['fontWeight', true],
                                    'font-style' : ['fontStyle', true],
                                    'font-size-adjust' : ['fontSizeAdjust', true],
                                    'color' : ['color', true],
                                    'text-transform' : ['textTransform', false],
                                    'text-decoration' : ['textDecoration', false],
                                    'letter-spacing' : ['letterSpacing', false],
                                    'word-spacing' : ['wordSpacing', false],
                                    'line-height' : ['lineHeight', true],
                                    'text-align' : ['textAlign', true],
                                    'vertical-align' : ['verticalAlign', true],
                                    'direction' : ['direction', false],
                                    'background-color' : ['backgroundColor', true]
                                },
                                readFontStyles = function (style) {
                                    
                                    var styles = {};
                                    for (var styleName in styleNames) {
                                        if (styleNames[styleName][1]) {
                                            styles[styleNames[styleName][0]] =
                                                (style.getPropertyCSSValue(styleName).cssText) || '';
                                        }
                                        
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
                                        //onInspectingMouseOver(e);
                                        
                                        if (multi.length === 0) {
                                            /* Firebug.Inspector.
                                            highlightObject(e.target, context, HIGHLIGHTTYPE, BOXFRAME, "#FCFFA7", true); */
                                            _highlightObject.call(Firebug.Inspector, e.target, context, HIGHLIGHTTYPE, BOXFRAME, "#FCFFA7", true);
                                        } else {
                                            /* Firebug.Inspector.
                                            highlightObject(multi, context, HIGHLIGHTTYPE, BOXFRAME, ["#FCFFA7",'green'], true); */
                                            _highlightObject.call(Firebug.Inspector, multi, context, HIGHLIGHTTYPE, BOXFRAME, ["#FCFFA7", 'green'], true);
                                        }
                                        
                                        /* var la=document.createElement('img');
                                        la.src="resource://firetestie_r/data.png";
                                        document.body.appendChild(la); */
                                        if(multi.length == 2) {
                                             var frameOffset = getFrameOffset(e.target.ownerDocument.defaultView);
                                            showPbox(multi[0], multi[1],(e.clientX + frameOffset.left),(e.clientY + frameOffset.top));
                                        }
                                        
                                    }
                                    Events.cancelEvent(e);
                                },
                                showPbox = function (ele1, ele2,x,y) {
                                    log('show PBOX');
                                    var pbox = document.getElementById('pbox'),
                                    a = getLTRBWH(ele1),
                                    b = getLTRBWH(ele2);
                                    if (!pbox) {
                                        pbox = document.createElement('div');
                                        pbox.setAttribute('id', 'pbox');
                                        pbox.setAttribute('class', 'pbox');
                                        
                                        document.body.appendChild(pbox);
                                        /* evt.addListerner(pbox,'mouseover',function(){
                                        pbox.style.opacity='0.4';
                                        }); */
                                        
                                        //fix一个奇怪的bug
                                        pbox.style.zIndex = '99999999999999999999999999999999999999999';
                                    }
                                    pbox.style.left=x+'px';
                                    pbox.style.top=y+'px';
                                    log(x);
                                    log(y);
                                    log(pbox.style.x);
                                    log(pbox.style.y);
                                    //pbox.setAttribute('style',"right:298px !important;top:5px !important; ");
                                    pbox.innerHTML = '<div class=" wrapper">' +
                                        '<div class=" tag_a">' + ele1.tagName + '</div>' +
                                        '<div class=" tag_b">' + ele2.tagName + '</div>' +
                                        '<div class=" d1">' + parseInt(b.y - a.y) + 'px</div>' +
                                        '<div class=" d2">' + parseInt(b.y - (a.y + a.h)) + 'px</div>' +
                                        '<div class=" d3">' + parseInt(b.x - (a.x + a.w)) + 'px</div>' +
                                        '<div class=" d4">' + parseInt(b.x - a.x) + 'px</div>' +
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
                                    var frameOffset = getFrameOffset(e.target.ownerDocument.defaultView);
                                    var pbox = document.getElementById('pbox');
                                    if(pbox){
                                        
                                        showPbox(multi[0],multi[1],(e.clientX + frameOffset.left),(e.clientY + frameOffset.top));
                                        return;
                                    }else if (ftBox) {
  
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
                                        h : h
                                    };
                                },
                                setftBox = function (x, y) {
                                    if(document.getElementById('pbox')){
                                        return;
                                    }
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
                                     var pbox = document.getElementById('pbox');
                                     var frameOffset=getFrameOffset(e.target.ownerDocument.defaultView);
                                     if(pbox){
                                     
                                        showPbox(multi[0],multi[1],(e.clientX + frameOffset.left),(e.clientY + frameOffset.top));
                                        
                                     }else{
                                        if (multi.length === 0) {
                                            /* Firebug.Inspector.
                                            highlightObject(e.target, context, HIGHLIGHTTYPE, BOXFRAME, "#FCFFA7", true); */
                                            _highlightObject.call(Firebug.Inspector, e.target, context, HIGHLIGHTTYPE, BOXFRAME, "#FCFFA7", true);
                                        } else {
                                            /* Firebug.Inspector.
                                            highlightObject(multi, context, HIGHLIGHTTYPE, BOXFRAME, ["#FCFFA7",'green'], true); */
                                            _highlightObject.call(Firebug.Inspector, multi, context, HIGHLIGHTTYPE, BOXFRAME, ["#FCFFA7", 'green'], true);
                                        }
                                    }
                                    
                                    
                                    //e.target.ownerDocument.addEventListener("click",onInspectingClick,true);
                                    evt.addListerner(e.target.ownerDocument, "click", onInspectingClick);
                                    evt.addListerner(e.target.ownerDocument, "keyup", onHotKeyUp);
                                    evt.addListerner(e.target.ownerDocument, 'keydown', onAlt);
                                    
                                    
                                    /* var win = (e.target.ownerDocument ? e.target.ownerDocument.defaultView : null),
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
                                            boxStyle.borderBottom); */
                                    
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
                                        //drawBox(multi);
                                        /* if (multi.length == 2) {
                                            showPbox(multi[0], multi[1],);
                                        } */
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
                                                onEnabledBtnClick : function (e) {},
                                                
                                                searchForm:FORM({
                                                    method:'GET',
                                                    action:'#',
                                                    style:'margin:10px;'
                                                }),
                                                searchInput:INPUT({
                                                    type:'text',
                                                    style:'width:500px;'
                                                }),
                                                submitSearch:INPUT({
                                                    type:'submit'
                                                }),
                                                matchtable :
                                                TABLE({
                                                        style : 'border-collapse:collapse;border-spacing:0;margin-top:20px;',
                                                        width : "80%"
                                                    }),
                                                cssAttrTable :
                                                TABLE({
                                                        style : 'border-collapse:collapse;border-spacing:0;margin-top:20px;',
                                                        width : "80%"
                                                    }),
                                            });
                                    
                                    var panel = context.getPanel('FireTestie');
                                    //log(panel);
                                    var parentNode = panel.panelNode;
                                    var rootTemplateElement = textWrapper.mainWrapper.replace({}, parentNode, textWrapper);
                                    var la = match();
                                    var EnableBtnElement = textWrapper.EnableBtn.append(EnableBtnElement, rootTemplateElement, textWrapper);
                                    var searchForm = textWrapper.searchForm.append(null, rootTemplateElement, textWrapper);
                                    var searchInput = textWrapper.searchInput.append(null, rootTemplateElement, searchForm);
                                    var submitSearch = textWrapper.submitSearch.append(null, rootTemplateElement, searchForm);
                                    var matchTable = textWrapper.matchtable.append(null, rootTemplateElement, textWrapper);
                                    var cssTable = textWrapper.cssAttrTable.append(null, rootTemplateElement, textWrapper);
                                    function searchDom(e){
                                        Firebug.Inspector.clearAllHighlights();
                                        var val=searchInput.value,
                                            ret=query(val);
                                        
                                        var w = document.defaultView;
                                        for (var i = 0; i < w.frames.length; i++) {
                                            ret = ret.concat(query(val, w.frames[i].document.body));
                                        }
                                        log(val);
                                        log(ret);
                                        if(ret.length>0){
                                            _highlightObject.call(Firebug.Inspector, ret, context, HIGHLIGHTTYPE, BOXFRAME, ["#FCFFA7", 'green'], true);
                                        }
                                        e && e.preventDefault();
                                    }
                                    function onSearchInputBlur(e){
                                        clearInterval(searchInterval);
                                        evt.removeListener(searchInput,'blur',onSearchInputBlur);
                                    }
                                    var searchInterval;
                                    evt.addListerner(submitSearch,'click',searchDom);
                                    evt.addListerner(searchInput,'focus',function(){
                                      /*   evt.addListerner(searchInput,'blur',onSearchInputBlur);
                                        searchInterval=setInterval(searchDom,20); */
                                        
                                    });
                                    //log(EnableBtnElement);
                                    //Firebug.match="";
                                    evt.addListerner(EnableBtnElement, 'click', function (e) {
                                            var target = e.target;
                                            //target.disabled='true';
                                            /*  function lalala() {
                                            }
                                            lalala.call(Firebug.Inspector.BoxModelHighlighter); */
                                            if (target.value === 'Enabled') {
                                                ready();
                                                target.setAttribute('value', 'Disabled');
                                                //target.value="OFF";
                                                log(textWrapper.EnableBtn);
                                                alert('Inspector ON');
                                            } else {
                                                firetestieStop();
                                                // target.value="ON";
                                                target.setAttribute('value', 'Enabled');
                                                alert('Inspector OFF');
                                            }
                                        });
                                    var matchTableTmp = '<tr style="border-top:2px solid #000;">' +
                                        '<th colspan="3" style="font-size:20px;' +
                                        'font-weight:bold;">Firetestie.JSON</th>' +
                                        '</tr>' +
                                        '<tr style="text-align:start;border-bottom:1px solid #333;">' +
                                        '<td style="width:30px;"><input type="radio" name="match"' + (forceMatch === undefined ? ' checked' : '') + ' class="match_rule" value=""></td>' +
                                        '<td style="width:12%;border-right:1px dashed #333;' +
                                        'padding-left:7px;padding-top:3px;padding-bottom:3px;">' +
                                        'None</td><td style="padding-left:7px;padding-top:3px;padding-bottom:3px;"></td></tr>';
                                    
                                    for (var i in la) {
                                        
                                        matchTableTmp += ('<tr style="text-align:start;border-bottom:1px solid #333;">' +
                                            '<td style="width:30px;"><input type="radio" name="match"' + (forceMatch === i ? ' checked' : '') + ' class="match_rule" value="' + i + '"></td>' +
                                            '<td style="width:12%;border-right:1px dashed #333;' +
                                            'padding-left:7px;padding-top:3px;padding-bottom:3px;">' +
                                            i + '</td><td style="padding-left:7px;padding-top:3px;padding-bottom:3px;">' +
                                            JSON.stringify(la[i]) +
                                            '</td></tr>');
                                        
                                    }
                                    
                                    matchTable.innerHTML = matchTableTmp;
                                    var allRadio = matchTable.getElementsByClassName('match_rule');
                                    //log(allRadio);
                                    for (var i in allRadio) {
                                        //log(allRadio[i]);
                                        evt.addListerner(allRadio[i], 'click', function (e) {
                                                var val = e.target.value,
                                                forceMatch = val || undefined,
                                                rule,
                                                cur,
                                                selector = '',
                                                ret;
                                                if (forceMatch) {
                                                    Firebug.Inspector.clearAllHighlights();
                                                    rule = match();
                                                    cur = rule[val]
                                                        if (cur) {
                                                            if (cur.tagName) {
                                                                selector += cur.tagName;
                                                            }
                                                            if (cur.id) {
                                                                selector += '#' + cur.id;
                                                            }
                                                            if (cur.className) {
                                                                selector += '.' + cur.className;
                                                            }
                                                            
                                                            for (attr in cur) {
                                                                if (['tagName'/* ,'id','className' */].indexOf(attr) !== -1) {
                                                                    continue;
                                                                }
                                                                /* if(attr==='style'){
                                                                
                                                                }else  */
                                                                if (attr !== 'style') {
                                                                    var tmp = attr === 'className' ? 'class' : attr;
                                                                    /*  if(attr==='className'){
                                                                    attr='class';
                                                                    } */
                                                                    selector += '[' + tmp + '="' + cur[attr] + '"]'
                                                                }
                                                            }
                                                        }
                                                        ret = query(selector);
                                                    var w = document.defaultView;
                                                    for (var i = 0; i < w.frames.length; i++) {
                                                        ret = ret.concat(query(selector, w.frames[i].document.body));
                                                    }
                                                    
                                                    if (cur['style'] && ret.length > 0) {
                                                        for (var i = 0; i < ret.length; i++) {
                                                            if (ret[i]instanceof window.Element) {
                                                                var tmpStyle = ret[i].ownerDocument.defaultView.getComputedStyle(ret[i], null);
                                                                for (cssMatch in cur['style']) {
                                                                    var t = tmpStyle[cssMatch];
                                                                    if (/rgb\(\d+,\s\d+,\s\d+\)/.test(t)) {
                                                                        t = rgbToHex(t);
                                                                    }
                                                                    if (!tmpStyle[cssMatch] || cur['style'][cssMatch] !== t) {
                                                                        //delBuffer.push(i);
                                                                        delete ret[i];
                                                                    }
                                                                }
                                                            }
                                                            
                                                        }
                                                    }
                                                    
                                                    ret.sort();
                                                    
                                                    if (ret.length > 0) {
                                                        _highlightObject.call(Firebug.Inspector, ret, context, HIGHLIGHTTYPE, BOXFRAME, ["#FCFFA7", 'green'], true);
                                                    }
                                                }
                                            });
                                    }
                                    
                                    var cssTableTmp = '<tr>';
                                    var count = 0;
                                    for (var styleName in styleNames) {
                                        count += 1;
                                        cssTableTmp += '<td><input id="' + styleNames[styleName][0] + '_cssattr" type="checkbox" value="' + styleName + '" name="cssattr" class="cssattr"' + (styleNames[styleName][1] ? ' checked' : '') + '><label for="' + styleNames[styleName][0] + '_cssattr">' + styleNames[styleName][0] + '</label></td>';
                                        if (count % 4 === 0) {
                                            cssTableTmp += '</tr><tr>';
                                        }
                                        count
                                    }
                                    
                                    cssTableTmp += '</tr>'
                                    
                                    cssTable.innerHTML = cssTableTmp;
                                    var allCheck = cssTable.getElementsByClassName('cssattr');
                                    for (var i in allCheck) {
                                        //log(allRadio[i]);
                                        evt.addListerner(allCheck[i], 'change', function (e) {
                                                var is = e.target.checked,
                                                val = e.target.value;
                                                /*forceMatch=val || undefined;
                                                //log(forceMatch); */
                                                
                                                if (is) {
                                                    styleNames[val][1] = true;
                                                } else {
                                                    styleNames[val][1] = false;
                                                }
                                            });
                                        
                                    }
                                },
                                matchTable = null,
                                match = function () {
                                    var obj = {};
                                    function doMatch(param, style, item) {
                                        //var itemName = testItem;
                                        //log('项目'+itemName+'开始匹配');
                                        var pass = true;
                                        var matchResult = {};
                                        //log(item);
                                        for (var attr in item) {
                                            //log(style);
                                            if (attr === 'style') {
                                                for (var s in item['style']) {
                                                    //log(style[s]);
                                                    var curS = style[s];
                                                    if (style[s] && /rgb\(\d+,\s\d+,\s\d+\)/.test(style[s])) {
                                                        curS = rgbToHex(style[s]);
                                                    }
                                                    if (style[s] && /rgb\(\d+,\s\d+,\s\d+\)/.test(item['style'][s])) {
                                                        item['style'][s] = rgbToHex(item['style'][s]);
                                                    }
                                                    
                                                    if (!!forceMatch) {
                                                        matchResult[s] = {
                                                            status : style[s] === item['style'][s],
                                                            org : curS,
                                                            match_rule : item['style'][s]
                                                        };
                                                    }
                                                    if (style[s] && style[s] !== item['style'][s]) {
                                                        pass = false;
                                                        if (!forceMatch) {
                                                            
                                                            break;
                                                        }
                                                        
                                                    }
                                                }
                                            } else {
                                                if (!!forceMatch) {
                                                    matchResult[attr] = {
                                                        status : param[attr] && param[attr].toLowerCase() === item[attr].toLowerCase(),
                                                        org : param[attr],
                                                        match_rule : item[attr]
                                                    };
                                                }
                                                if (param[attr] && param[attr].toLowerCase() !== item[attr].toLowerCase()) {
                                                    pass = false;
                                                    if (!forceMatch) {
                                                        break;
                                                    }
                                                }
                                            }
                                            
                                        }
                                        if (!!forceMatch) {
                                            return matchResult;
                                        }
                                        return pass;
                                    }
                                    return function (param) {
                                        if (param instanceof window.Element) {
                                            //log(param);
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
                                            if (!!forceMatch) {
                                                return doMatch(param, style, obj[forceMatch]);
                                                /* if(doMatch(param,style,obj[forceMatch])){
                                                return forceMatch;
                                                }else{
                                                return 'N/A';
                                                } */
                                                
                                            } else {
                                                for (var testItem in obj) {
                                                    var itemName = testItem;
                                                    //log('项目'+itemName+'开始匹配');
                                                    /* var pass = true;
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
                                                    
                                                    } */
                                                    var pass = doMatch(param, style, obj[itemName]);
                                                    //log(pass);
                                                    if (pass) {
                                                        return itemName;
                                                    } else {
                                                        continue;
                                                    }
                                                }
                                            }
                                            
                                            return '';
                                        } else if (typeof param === 'string') {
                                            obj = JSON.parse(param);
                                        } else if (typeof param === 'undefined') {
                                            return obj;
                                        }
                                    }
                                }
                                (),
                                hide = function () {
                                    //firetestieStop();
                                },
                                firetestieStop = function () {
                                    
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
                                    
                                    forceMatch = undefined;
                                    
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
                    //Firebug.chrome.$('fbCommandLine').mInputField.style.fontSizeAdjust='none';
                });
        }
    });