FBL.ns(function() { with (FBL) {
    var HIGHLIGHTTYPE="boxModel",
        BOXFRAME="content";
    var fireTestiePanel=function(){},
        config = Firebug.getModuleLoaderConfig(),
        modules = ["firebug/lib/css","firebug/lib/dom","firebug/lib/events","firebug/firefox/menu"],
        log = Firebug.Console.log,
        undefined;
        
    require(config, modules,function(Css,Dom,Events,Menu){
        fireTestiePanel.prototype = extend(Firebug.Panel,function(){
            var documentElement,highlighter,context,styleSheet,ftBox,csstable,layout,
                windowX=0,
                windowY=0,
                initialize=function(){
                    documentElement = window.getBrowser().selectedBrowser.contentDocument;
                    Firebug.Panel.initialize.apply(this, arguments);
                    windowX=documentElement.documentElement.clientWidth;
                    windowY=documentElement.documentElement.clientHeight;
                    
                    documentElement.defaultView.addEventListener("resize",function(e){
                        windowX=documentElement.documentElement.clientWidth;
                        windowY=documentElement.documentElement.clientHeight;
                    },true);
                },
                onInspectingMouseMove=function(e){
                    if(ftBox){
                        /* ftBox.style.top=(e.clientY+10)+"px";
                        ftBox.style.left=(e.clientX+10)+"px"; */
                        setftBox((e.clientX+10),(e.clientY+10));
                    }
                },
                setftBox=function(x,y){
                    ftBox.style.top=(Math.min(y,windowY-390))+"px";
                    ftBox.style.left=(Math.min(x,windowX-280))+"px";
                },
                onInspectingMouseOut=function(e){
                    if(ftBox!==undefined){
                        ftBox.removeEventListener("mousemove",onInspectingMouseMove,true);
                        documentElement.body.removeChild(ftBox);
                        ftBox=undefined;
                    }
                    documentElement.removeEventListener("click",onInspectingClick,true);
                },
                onInspectingMouseOver=function(e){
                    Firebug.Inspector.highlightObject(e.target,context,HIGHLIGHTTYPE,BOXFRAME,"green");
                    documentElement.addEventListener("click",onInspectingClick,true);
                    
                    var win = (e.target.ownerDocument ? e.target.ownerDocument.defaultView : null),
                        style=documentElement.defaultView.getComputedStyle(e.target,""),
                        boxStyle=Css.readBoxStyles(style),
                        cssTableInner="",
                        offset = Dom.getLTRBWH(e.target),
                        x = offset.left - Math.abs(boxStyle.marginLeft),
                        y = offset.top - Math.abs(boxStyle.marginTop),
                        w = offset.width - (boxStyle.paddingLeft + boxStyle.paddingRight + boxStyle.borderLeft + boxStyle.borderRight),
                        h = offset.height - (boxStyle.paddingTop + boxStyle.paddingBottom + boxStyle.borderTop + boxStyle.borderBottom);
                     
                    if(!ftBox){
                       ftBox=documentElement.createElement('dialog');
                       csstable=documentElement.createElement('csstable');
                       layout=documentElement.createElement('layout');
                    }
                    e.target.addEventListener("mousemove",onInspectingMouseMove,true);
                    
                   /*  ftBox.style.top=(e.clientY+10)+"px";
                    ftBox.style.left=(e.clientX+10)+"px"; */
                    setftBox((e.clientX+10),(e.clientY+10));
                    ftBox.innerHTML='<h1>'+e.target.tagName+(e.target.id?('#'+e.target.id):'')+'</h1>';
                    
                    cssTableInner='<table><tbody>';
                    var counter=0;
                    for(ele in boxStyle){
                        if(counter>4){
                            break;
                        }
                        cssTableInner+=('<tr><td class="cssname">'+ele+'</td><td>'+boxStyle[ele]+'</td></tr>');
                        counter++;
                    }
                    cssTableInner+='</tbody></table>';
                    csstable.innerHTML=cssTableInner;
                    ftBox.appendChild(csstable); 
                  
                   
                    layout.innerHTML='<span class="layout-figure offset-left figure_x" id="">'+x+'</span>'+
                                     '<span class="layout-figure offset-right figure_x" id="">0</span>'+
                                     '<span class="layout-figure offset-top figure_y" id="">'+y+'</span>'+
                                     '<span class="layout-figure offset-bottom figure_y" id="">0</span>'+
                                     '<span class="layout-figure margin-left figure_x" id="">'+boxStyle['marginLeft']+'</span>'+
                                     '<span class="layout-figure margin-right figure_x" id="">'+boxStyle['marginRight']+'</span>'+
                                     '<span class="layout-figure margin-top figure_y" id="">'+boxStyle['marginTop']+'</span>'+
                                     '<span class="layout-figure margin-bottom figure_y" id="">'+boxStyle['marginBottom']+'</span>'+
                                     '<span class="layout-figure border-left figure_x" id="">'+boxStyle['borderLeft']+'</span>'+
                                     '<span class="layout-figure border-right figure_x" id="">'+boxStyle['borderRight']+'</span>'+
                                     '<span class="layout-figure border-top figure_y" id="">'+boxStyle['borderTop']+'</span>'+
                                     '<span class="layout-figure border-bottom figure_y" id="">'+boxStyle['borderBottom']+'</span>'+
                                     '<span class="layout-figure padding-left figure_x" id="">'+boxStyle['paddingLeft']+'</span>'+
                                     '<span class="layout-figure padding-right figure_x" id="">'+boxStyle['paddingRight']+'</span>'+
                                     '<span class="layout-figure padding-top figure_y" id="">'+boxStyle['paddingTop']+'</span>'+
                                     '<span class="layout-figure padding-bottom figure_y" id="">'+boxStyle['paddingBottom']+'</span>'+
                                     '<span class="layout-figure label-margin" id="">Margin</span>'+
                                     '<span class="layout-figure label-border" id="">Border</span>'+
                                     '<span class="layout-figure label-padding" id="">Padding</span>'+
                                     '<span class="layout-figure figure_x label-content" id="">'+w+'*'+h+'</span>'+
                                     '<span class="layout-figure label-offset" id="">offset</span>'+
                                     '<marginbox><borderbox><paddingbox><contentbox></contentbox></paddingbox></borderbox></marginbox>';
                    ftBox.appendChild(layout);
                    
                    documentElement.body.appendChild(ftBox);
                    
                },
                onInspectingMouseUp=function(e){
                    
                },
                onInspectingMouseDown=function(e){
                    
                },
                onInspectingClick=function(e){
                    Events.cancelEvent(event);
                },
                show=function(){
                    
                    context=Firebug.currentContext;
                    styleSheet=documentElement.createElement("style");
                    styleSheet.innerHTML="dialog dialog h1,dialog h2,dialog h3,dialog h4,dialog h5,dialog h6,dialog p,dialog hr,dialog article,dialog aside,dialog section,dialog figure,dialog footer,dialog header,dialog dl,dialog dt,dialog dd,dialog ul,dialog ol,dialog li,dialog th,dialog td,dialog form,dialog fieldset,dialog input,dialog button,dialog textarea{margin:0;padding:0;}dialog header,dialog nav,dialog footer,dialog wrapper,dialog csstable,dialog marginbox,dialog contentbox,dialog paddingbox,dialog borderbox,dialog section{display:block;}dialog button,dialog input,dialog select,dialog textarea{font:12px/1 Tahoma,Arial;}dialog button,dialog h1,dialog h2,dialog h3,dialog h4,dialog h5,dialog h6{font-size:100%;font:normal 12px Tahoma,Arial;}dialog li{list-style:none;}dialog button,dialog input,dialog select,dialog textarea{font-size:100%;border:none;background:none;}dialog input:focus,dialog textarea:focus{outline:none;}dialog fieldset,dialog img{border:0 none;}dialog img{vertical-align:middle;}dialog table{border-collapse:collapse;border-spacing:0;}dialog q:before,dialog q:after{content:'';}dialog address,dialog cite,dialog em{font-style:normal;}dialog{z-index:2147483647;border:1px solid #eee;display:block;position:absolute;top:200px;left:200px;width:260px;height:370px;-moz-border-radius:3px;-moz-box-shadow:0 0 10px rgba(0,0,0,0.2);background:#ededed;margin:0;padding:0;}dialog h1{color:#F47A24;font-size:22px;font-weight:bold;font-family:Arial;line-height:140%;text-indent:5px;border-bottom:1px dashed #d5d5d5;}csstable{font-size:11px;margin:7px auto auto 15px;border-bottom:1px dashed #d5d5d5;}csstable tr{height:18px;}csstable .cssname{width:85px;font-weight:bold;}marginbox,contentbox,paddingbox,borderbox{margin:25px auto;}marginbox{width:200px;height:200px;border:1px dashed #000;}borderbox{width:150px;height:150px;border:1px dashed #000;}paddingbox{width:100px;height:100px;border:1px dashed #000;}contentbox{width:50px;height:50px;border:1px dashed #000;}.layout-figure{position:absolute;font-size:10px;}.figure_x{top:255px;}.figure_y{right:121px}.margin-left{right:207px;text-align:right;}.margin-right{left:207px;text-align:left;}.margin-top{top:165px;}.margin-bottom{top:340px;}.border-left{right:182px;text-align:right;}.border-right{left:182px;text-align:left;}.border-top{top:194px;}.border-bottom{top:314px;}.offset-left{right:235px;text-align:right;}.offset-right{left:235px;text-align:left;}.offset-top{top:143px;}.offset-bottom{top:360px;}.padding-left{right:157px;text-align:right;}.padding-right{left:157px;text-align:left;}.padding-top{top:222px;}.padding-bottom{top:285px;}.label-margin{top:155px;left:30px;}.label-border{top:181px;left:55px;}.label-padding{top:208px;left:81px;}.label-content{left:107px;}.label-offset{left:5px;top:132px;}";

                    documentElement.head.appendChild(styleSheet);
                
                    documentElement.addEventListener("mouseover", onInspectingMouseOver, true);
                    documentElement.addEventListener("mouseout",onInspectingMouseOut,true); /**/
                },
                hide=function(){
                    if(styleSheet){
                        documentElement.head.removeChild(styleSheet);
                    }
                    
                    Firebug.Inspector.clearAllHighlights();
                    documentElement.removeEventListener("mouseover", onInspectingMouseOver, true); /**/
                    
                },
                getOptionsMenuItems=function(){
 
                };
            return {
                name: "FireTestie",
                title: "FireTestie",

                initialize: initialize,
                show:show,
                hide:hide,
                getOptionsMenuItems:getOptionsMenuItems,
            }
        }());
        Firebug.registerPanel(fireTestiePanel);
    });
}});