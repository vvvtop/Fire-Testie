FBL.ns(function() { with (FBL) {
var HIGHLIGHTTYPE='boxModel',
    BOXFRAME='border',
    READYTIMEOUT=1,
    BOXDES=15,
    
    //
    config=Firebug.getModuleLoaderConfig(),
    modules=[
        "firebug/lib/css",
        "firebug/lib/dom",
        "firebug/lib/events",
        "firebug/firefox/menu",
        "firebug/firefox/tabWatcher"
    ],
    fireTestiePanel=function(){},
    undefined;
var evt=function(){
    var list=[];
    return {
        addListerner:function(element,type,callback){
            element.addEventListener(type,callback,true);
            list.push({
                element:element,
                callback:callback,
                type:type
            });
        },
        removeListener:function(element,type,callback){
            element.removeEventListener(type,callback,true);
        },
        removeAll:function(){
            try{
                for(var index in list){
                    evt.removeListener(list[index].element,list[index].type,list[index].callback,true);
                }
            }catch(e){}
            
        }
    };
}();    
require(config, modules,function(Css,Dom,Events,Menu){
    fireTestiePanel.prototype = extend(Firebug.Panel,function(){
        var document,readyTimeout,context,styleSheet,ftBox,tmpDoc,flag=false,lastDom,isAlt=false,multi,isMulti=false
            drawBox=function(){},
            windowX=0,
            windowY=0,
            initialize=function(){
                Firebug.Panel.initialize.apply(this, arguments);
            },
            ready=function(){
                waitReady();
            },
            waitReady=function(){
                if(!document || !(document instanceof window.Document)){
                    if(window &&
                        window.getBrowser &&
                        window.getBrowser().selectedBrowser &&
                        window.getBrowser().selectedBrowser.contentDocument){
                        document=window.getBrowser().selectedBrowser.contentDocument;
                        readyTimeout && clearTimeout(readyTimeout);
                        
                        start();
                    }else{
                        readyTimeout=setTimeout(function(){
                            waitReady();
                        },1)
                    }
                    try{
                       document=window.getBrowser().selectedBrowser.contentDocument; 
                       
                    }catch(e){
                        
                    };
                }
            },
            start=function(){
                windowX=document.documentElement.clientWidth;
                windowY=document.documentElement.clientHeight;
                evt.addListerner(document.defaultView,"resize",function(e){
                    windowX=document.documentElement.clientWidth;
                    windowY=document.documentElement.clientHeight;
                });
                /* document.defaultView.addEventListener("resize",function(e){
                    windowX=document.documentElement.clientWidth;
                    windowY=document.documentElement.clientHeight;
                },true); */
                
                context=Firebug.currentContext;
                
                /* document.addEventListener("mouseover",onInspectingMouseOver,true);
                document.addEventListener("mouseout",onInspectingMouseOut,true); */
                evt.addListerner(document,"mouseover",onInspectingMouseOver);
                evt.addListerner(document,"mouseout",onInspectingMouseOut);

                drawBox=function(){
                    if(!flag){
                        ftBox=document.createElement('dialog');
                        flag=true;
                    }else{
                        ftBox.innerHTML='';
                    }
                    
                        
                    
                    return function(args){
                        ftBox.innerHTML='';
                        for(arg in args){
                            var boxStyle=document.createElement('style'),
                                title=document.createElement('h1'),
                                csstable=document.createElement('csstable'),
                                layout=document.createElement('layout'),
                                clear=document.createElement('div');
                                
                                
                                ftBox.appendChild(title);
                                ftBox.appendChild(csstable);
                                ftBox.appendChild(layout);
                                ftBox.appendChild(clear);
                                
                                boxStyle.innerHTML='dialog dialog h1,dialog h2,dialog h3,dialog h4,dialog h5,dialog h6,dialog p,dialog hr,dialog article,dialog aside,dialog section,dialog figure,dialog footer,dialog header,dialogdl,dialog dt,dialog dd,dialog ul,dialog ol,dialog li,dialog th,dialog td,dialogform,dialog fieldset,dialog input,dialog button,dialog textarea,dialog *{margin:0;padding:0;}dialog header,dialog nav,dialog footer,dialog wrapper,dialog csstable,dialog marginbox,dialog contentbox,dialog paddingbox,dialog borderbox,dialog section{display:block;}dialog button,dialog input,dialog select,dialog textarea{font:12px/1 Tahoma,Arial;}dialog button,dialog h1,dialog h2,dialog h3,dialog h4,dialog h5,dialog h6{font-size:100%;font:normal 12px Tahoma,Arial;}dialog li{list-style:none;}dialog button,dialog input,dialog select,dialog textarea{font-size:100%;border:none;background:none;}dialog input:focus,dialog textarea:focus{outline:none;}dialog fieldset,dialog img{border:0 none;}dialog img{vertical-align:middle;}dialog table{border:0 none !important;margin:0 !important;padding:border-collapse:collapse;border-spacing:0;}dialog q:before,dialog q:after{content:"";}dialog address,dialog cite,dialog em{font-style:normal;}dialog{z-index:2147483647;border:1px solid #eee;display:block;position:absolute;top:200px;left:200px;width:490px;height:auto;-moz-border-radius:3px;-moz-box-shadow:0 0 10px rgba(0,0,0,0.2);background:#ededed;margin:0;padding:0;text-align:start;color:#333;font-family:Arial;font-size:11px;}layout{position:relative;width:100%;width:284px;float:left;}dialog h1{margin:0;padding:0;color:#F47A24;font-size:22px;font-weight:bold;font-family:Arial;line-height:140%;text-indent:5px;border-bottom:1px dashed #d5d5d5;height:31px;text-align:left;}csstable{font-size:11px;margin:7px auto auto 15px;border-right:1px dashed #d5d5d5;width:190px;float:left;}csstable tr{height:18px;}csstable .cssname{width:95px;font-weight:bold;}marginbox,contentbox,paddingbox,borderbox{margin:25px auto;}marginbox{width:200px;height:200px;border:1px dashed #000;}borderbox{width:150px;height:150px;border:1px dashed #000;}paddingbox{width:100px;height:100px;border:1px dashed #000;}contentbox{width:50px;height:50px;border:1px dashed #000;}.layout-figure{position:absolute;font-size:10px;}.figure_x{top:125px;}.figure_y{right:138px}.margin-left{right:219px;text-align:right;}.margin-right{left:220px;text-align:left;}.margin-top{top:37px;}.margin-bottom{top:205px;}.border-left{right:194px;text-align:right;}.border-right{left:194px;text-align:left;}.border-top{top:66px;}.border-bottom{top:179px;}.offset-left{right:245px;text-align:right;}.offset-right{left:245px;text-align:left;}.offset-top{top:13px;}.offset-bottom{top:230px;}.padding-left{right:170px;text-align:right;}.padding-right{left:170px;text-align:left;}.padding-top{top:92px;}.padding-bottom{top:156px;}.label-margin{top:30px;left:43px;}.label-border{top:54px;left:69px;}.label-padding{top:80px;left:95px;}.label-content{margin-top:20px;margin-left:auto;margin-right:auto;width:100%;hight:100%;display:block;text-align:center;}.label-offset{left:38px;top:13px;}';
                               
                                ftBox.appendChild(boxStyle);
                                ftBox.style.display='none';
                                document.body.appendChild(ftBox);
                            var cssTableInner='<table><tbody>',
                                fontStyles=readFontStyles(args[arg].css),
                                boxStyle=Css.readBoxStyles(args[arg].css);
                                
                                //clear float
                                clear.style.clear='both';
                                //Firebug.Console.log(boxStyle);
                            
                            title.innerHTML=args[arg].title || 'N/A';
                            
                            if(fontStyles){
                               for(var ele in fontStyles){
                                    cssTableInner+=('<tr><td class="cssname">'+ele+'</td><td>'+args[arg].css[ele]+'</td></tr>');
                                } 
                            }
                            cssTableInner+='</tbody></table>';
                            csstable.innerHTML=cssTableInner;
                            //Math.ceil(1.3)
                            layout.innerHTML='<span class="layout-figure offset-left figure_x" id="">'+Math.ceil(args[arg].x)+'</span>'+
                                         '<span class="layout-figure offset-right figure_x" id="">0</span>'+
                                         '<span class="layout-figure offset-top figure_y" id="">'+Math.ceil(args[arg].y)+'</span>'+
                                         '<span class="layout-figure offset-bottom figure_y" id="">0</span>'+
                                         '<span class="layout-figure margin-left figure_x" id="">'+Math.ceil(boxStyle['marginLeft'])+'</span>'+
                                         '<span class="layout-figure margin-right figure_x" id="">'+Math.ceil(boxStyle['marginRight'])+'</span>'+
                                         '<span class="layout-figure margin-top figure_y" id="">'+Math.ceil(boxStyle['marginTop'])+'</span>'+
                                         '<span class="layout-figure margin-bottom figure_y" id="">'+Math.ceil(boxStyle['marginBottom'])+'</span>'+
                                         '<span class="layout-figure border-left figure_x" id="">'+Math.ceil(boxStyle['borderLeft'])+'</span>'+
                                         '<span class="layout-figure border-right figure_x" id="">'+Math.ceil(boxStyle['borderRight'])+'</span>'+
                                         '<span class="layout-figure border-top figure_y" id="">'+Math.ceil(boxStyle['borderTop'])+'</span>'+
                                         '<span class="layout-figure border-bottom figure_y" id="">'+Math.ceil(boxStyle['borderBottom'])+'</span>'+
                                         '<span class="layout-figure padding-left figure_x" id="">'+Math.ceil(boxStyle['paddingLeft'])+'</span>'+
                                         '<span class="layout-figure padding-right figure_x" id="">'+Math.ceil(boxStyle['paddingRight'])+'</span>'+
                                         '<span class="layout-figure padding-top figure_y" id="">'+Math.ceil(boxStyle['paddingTop'])+'</span>'+
                                         '<span class="layout-figure padding-bottom figure_y" id="">'+Math.ceil(boxStyle['paddingBottom'])+'</span>'+
                                         '<span class="layout-figure label-margin" id="">Margin</span>'+
                                         '<span class="layout-figure label-border" id="">Border</span>'+
                                         '<span class="layout-figure label-padding" id="">Padding</span>'+
                                         '<span class="layout-figure label-offset" id="">offset</span>'+
                                         '<marginbox><borderbox><paddingbox><contentbox>'+
                                         '<span class="label-content" id="">'+Math.ceil(args[arg].w)+'*'+Math.ceil(args[arg].h)+'</span>'+
                                         '</contentbox></paddingbox></borderbox></marginbox>';
                            //ftBox=inner;
                        }
                        
                    }
                }();
                
            },
            readFontStyles = function(style){
                const styleNames = {
                    'font-family':'fontFamily',
                    'font-size':'fontSize',
                    'font-weight':'fontWeight',
                    'font-style':'fontStyle',
                    'font-size-adjust':'fontSizeAdjust',
                    'color':'color',
                    'text-transform':'textTransform',
                    'text-decoration':'textDecoration',
                    'letter-spacing':'letterSpacing',
                    'word-spacing':'wordSpacing',
                    'line-height':'lineHeight',
                    'text-align':'textAlign',
                    'vertical-align':'verticalAlign',
                    'direction':'direction',
                };

                var styles = {};
                for (var styleName in styleNames){
                    styles[styleNames[styleName]] = parseInt(style.getPropertyCSSValue(styleName).cssText) || 0;
                }
                    

               
                return styles;
            },
            onInspectingClick=function(e){
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
                if(e.ctrlKey){
                    var win = (e.target.ownerDocument ? e.target.ownerDocument.defaultView : null),
                        style=e.currentTarget.defaultView.getComputedStyle(e.target,""),
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
                    Firebug.Console.log('CTRL-CLICK');
                }
                Firebug.Console.log(e);
                Firebug.Console.log('CLICK');
                Events.cancelEvent(e);
            },
            onInspectingMouseMove=function(e){
                if(ftBox){
                    var frameOffset=getFrameOffset(e.target.ownerDocument.defaultView);

                    setftBox((e.clientX+frameOffset.left),(e.clientY+frameOffset.top));

                }
            },
            setftBox=function(x,y){
                var ftBoxOffset=Dom.getLTRBWH(ftBox);
                y=document.documentElement.scrollTop+y;
                /* ftBox.style.top=(Math.min(y+BOXDES,windowY-ftBoxOffset.height))+"px";
                ftBox.style.left=(Math.min(x+BOXDES,windowX-ftBoxOffset.width))+"px"; */
                ftBox.style.top=(y+BOXDES)+'px';
                ftBox.style.left=(x+BOXDES)+'px';
                ftBox.style.display='block';
            },
            onInspectingMouseOut=function(e){
                if(ftBox!==undefined){
                    //ftBox.removeEventListener("mousemove",onInspectingMouseMove,true);
                    evt.removeListener(ftBox,"mousemove",onInspectingMouseMove);
                    ftBox.style.display='none';
                }
                if(e.target.ownerDocument.defaultView.parent!==e.target.ownerDocument.defaultView){
                    //e.target.ownerDocument.defaultView.parent.document.addEventListener("mouseover",onInspectingMouseOver,true);
                    evt.addListerner(e.target.ownerDocument.defaultView.parent.document,"mouseover",onInspectingMouseOver);
                }
                //e.target.ownerDocument.removeEventListener("click",onInspectingClick,true);
                evt.removeListener(e.target.ownerDocument,"click",onInspectingClick);
                lastDom=e.target;
            },
            onInspectingMouseOver=function(e){
                /* if(multi==={}){
                    Firebug.Inspector.highlightObject(e.target,context,HIGHLIGHTTYPE,BOXFRAME,"green",true);
                }else{
                    Firebug.Inspector.highlightObject([e.target,multi],context,HIGHLIGHTTYPE,BOXFRAME,"green",true);
                } */
                
                Firebug.Inspector.highlightObject(e.target,context,HIGHLIGHTTYPE,BOXFRAME,"#FCFFA7",true);
                //e.target.ownerDocument.addEventListener("click",onInspectingClick,true);
                evt.addListerner(e.target.ownerDocument,"click",onInspectingClick);
 
                var win = (e.target.ownerDocument ? e.target.ownerDocument.defaultView : null),
                    style=(frameDoc||e.currentTarget).defaultView.getComputedStyle(e.target,""),
                    boxStyle=Css.readBoxStyles(style),
                    cssTableInner="",
                    offset = Dom.getLTRBWH(e.target),
                    x = offset.left - Math.abs(boxStyle.marginLeft),
                    y = offset.top - Math.abs(boxStyle.marginTop),
                    w = offset.width - (boxStyle.paddingLeft + boxStyle.paddingRight + boxStyle.borderLeft + boxStyle.borderRight),
                    h = offset.height - (boxStyle.paddingTop + boxStyle.paddingBottom + boxStyle.borderTop + boxStyle.borderBottom); 
                
                if(e.target.tagName==='IFRAME' || e.target.tagName==='FRAMESET'){
                    var frameDoc=e.target.contentWindow.document;
                    //frameDoc.addEventListener("mouseover",onInspectingMouseOver,true);
                    evt.addListerner(frameDoc,"mouseover",onInspectingMouseOver);
                    //frameDoc.addEventListener("mouseout",onInspectingMouseOut,true);
                    evt.addListerner(frameDoc,"mouseout",onInspectingMouseOut);
                    //e.target.contentWindow.parent.document.removeEventListener('mouseover',onInspectingMouseOver,true);
                    evt.removeListener(e.target.contentWindow.parent.document,'mouseover',onInspectingMouseOver);

                }
                
                //e.target.addEventListener("mousemove",onInspectingMouseMove,true);
                evt.addListerner(e.target,"mousemove",onInspectingMouseMove);
                if(multi==={}){
                    drawBox([
                        {
                            title:(e.target.tagName+(e.target.id?('#'+e.target.id):'')),
                            css:style,
                            x:x,
                            y:y,
                            w:w,
                            h:h
                        }
                    ]);
                }else{
                    drawBox([
                        {
                            title:(e.target.tagName+(e.target.id?('#'+e.target.id):'')),
                            css:style,
                            x:x,
                            y:y,
                            w:w,
                            h:h
                        },
                        multi.drawArgs
                    ]);
                }
                
                

                var frameOffset=getFrameOffset(e.target.ownerDocument.defaultView);

                setftBox((e.clientX+frameOffset.left),(e.clientY+frameOffset.top));
                ftBox.display='block';
                
                
            },
            getFrameOffset=function(winFrame,offset){
                if(!offset){
                    offset={
                        left:0,
                        top:0
                    };
                }
                var tmp=Dom.getLTRBWH(winFrame.frameElement);
                if(winFrame.parent!==winFrame.parent.parent){
                    
                    getFrameOffset(winFrame.parent,tmp);
                }else{
                    return {
                        left:offset.left+tmp.left,
                        top:offset.top+tmp.top
                    };
                }
            },
            
            show=function(){
                document=undefined;
                ready();

            },
            hide=function(){

                evt.removeAll();
                evt.removeListener(document,"mouseover", onInspectingMouseOver);
                 Firebug.Inspector.clearAllHighlights();
                try{
                    //document.head.removeChild(styleSheet);
                   
                    //document.removeEventListener("mouseover", onInspectingMouseOver, true);
                    
                }catch(e){};
            };
        return{
            name: "FireTestie",
            title: "FireTestie",

            initialize: initialize,
            show:show,
            hide:hide,
        };
    }());
Firebug.registerPanel(fireTestiePanel);
});
}});


