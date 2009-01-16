var ViewPort=Class.create({initialize:function(a){a.content=$(a.content_container);a.empty=a.empty_container?$(a.empty_container):null;a.error=a.error_container?$(a.error_container):null;this.opts=a;this.scroller=new ViewPort_Scroller(this);this.template=new Template(a.template);this.current_req_lookup=$H();this.current_req=$H();this.fetch_hash=$H();this.views=$H();this.showSplitPane(a.show_split_pane);this.isbusy=this.line_height=this.page_size=this.splitbar=this.splitbar_loc=this.uc_run=this.view=this.viewport_init=null;this.request_num=1},loadView:function(b,d,c){var a,f,h,e={},g;this._clearWait();if(this.page_size===null){g=this.getPageSize(this.show_split_pane?"default":"max");if(isNaN(g)){this.loadView.bind(this,b,d,c).defer();return}this.page_size=g}if(this.view){if(!c){this.views.set(this.view,{buffer:this._getBuffer(),offset:this.currentOffset()})}f=this.views.get(b)}else{h=true}if(c){e={background:true,view:b}}else{this.view=b;if(!this.viewport_init){this.viewport_init=1;this._renderViewport()}}if(f){this._updateContent(f.offset,e);if(!c){if(this.opts.onComplete){this.opts.onComplete()}this.opts.ajaxRequest(this.opts.fetch_action,this.addRequestParams({checkcache:1,rownum:this.currentOffset()+1}))}return true}else{if(!h){if(this.opts.onClearRows){this.opts.onClearRows(this.opts.content.childElements())}this.opts.content.update();this.scroller.clear()}}a=this._getBuffer(b,true);this.views.set(b,{buffer:a,offset:0});if(d){e.search=d}else{e.offset=0}this._fetchBuffer(e);return false},deleteView:function(a){this.views.unset(a)},scrollTo:function(a,c){var b=this.scroller;c=c||{};b.noupdate=c.noupdate;switch(this.isVisible(a)){case-1:b.moveScroll(a-1);break;case 0:if(c.top){b.moveScroll(a-1)}break;case 1:b.moveScroll(Math.min(a,this.getMetaData("total_rows")-this.getPageSize()+1));break}b.noupdate=false},isVisible:function(a){var b=this.currentOffset();return(a<b+1)?-1:((a>(b+this.getPageSize("current")))?1:0)},reload:function(a){if(this.isFiltering()){this.filter.filter(null,a)}else{this._fetchBuffer({offset:this.currentOffset(),purge:true,params:a})}},remove:function(f,c){if(this.isbusy){this.remove.bind(this,f,cacheid,view).defer();return}if(!f.size()){return}c=c||{};this.isbusy=true;var a,b=0,e=f.get("div"),d=e.size();this.deselect(f);if(c.cacheid){this._getBuffer(c.view).setMetaData({cacheid:c.cacheid},true)}if(d){a={duration:0.3,to:0.01};e.each(function(g){if(++b==d){a.afterFinish=this._removeids.bind(this,f,c)}Effect.Fade(g,a)},this)}else{this._removeids(f,c)}},_removeids:function(b,a){this._getBuffer(a.view).setMetaData({total_rows:this.getMetaData("total_rows",a.view)-b.size()},true);if(this.opts.onRemoveRows){this.opts.onRemoveRows(b)}this._getBuffer().remove(b.get("rownum"));if(this.opts.onCacheUpdate){this.opts.onCacheUpdate(a.view||this.view)}if(!a.noupdate){this.requestContentRefresh(this.currentOffset())}this.isbusy=false},addFilter:function(a,b){this.filter=new ViewPort_Filter(this,a,b)},runFilter:function(b,a){if(this.filter){this.filter.filter(Object.isUndefined(b)?null:b,a)}},isFiltering:function(){return this.filter?this.filter.isFiltering():false},stopFilter:function(a){if(this.filter){this.filter.clear(a)}},onResize:function(b,a){if(!this.uc_run||!this.opts.content.visible()){return}if(this.resizefunc){clearTimeout(this.resizefunc)}if(a){this._onResize(b)}else{this.resizefunc=this._onResize.bind(this,b).delay(0.1)}},_onResize:function(a){if(this.opts.onBeforeResize){this.opts.onBeforeResize()}this._renderViewport(a);if(this.opts.onAfterResize){this.opts.onAfterResize()}},requestContentRefresh:function(b){if(this._updateContent(b)){var a=this._getBuffer().isNearingLimit(b);if(a){this._fetchBuffer({offset:b,background:true,nearing:a})}return true}return false},_fetchBuffer:function(a){if(this.isbusy){this._fetchBuffer.bind(this,a).defer();return}this.isbusy=true;if(this.opts.onFetch&&!a.background){this.opts.onFetch()}var m=(a.view||this.view),h=this.opts.fetch_action,f,n=this._getBuffer(m),j,d,g=$H(a.params),e,p,q,l,c,k,o,i;if(a.purge){g.set("purge",true)}if(a.search){k="search";o=a.search;d=this._lookbehind(m);g.update({search_before:d,search_after:n.bufferSize()-d})}else{k="rownum";o=a.offset+1;f=n.getAllRows(true);c=a.rowlist?a.rowlist:this._getSliceBounds(o,a.nearing,m);l=$A($R(c.start,c.end)).diff(f);if(!a.purge&&!l.size()){this.isbusy=false;return}g.update({slice:l.first()+":"+l.last()})}g.set(k,Object.toJSON(o));if(this.isFiltering()){h=this.filter.getAction()}p=[m,k,o].toJSON();e=this.fetch_hash.get(p);j=this.current_req.get(m);if(j){if(e&&j.get(e)){if(++j.get(e).count==4){this._displayFetchError();this._removeRequest(m,e);this.isbusy=false;return}}else{if(k=="rownum"){i=$A($R(o,o+this.getPageSize())).diff(f);if(!i.size()){this.isbusy=false;return}q=j.keys().numericSort().find(function(b){var s=j.get(b).rlist;i=i.diff(s);if(!i.size()){return true}l=l.diff(s)});if(q){if(!a.background){this._addRequest(m,q,{background:false,offset:o-1})}this.isbusy=false;return}else{if(!a.background){j.keys().each(function(b){this._addRequest(m,b,{background:true})},this)}}}}}if(!e){e=this.fetch_hash.set(p,this.request_num++)}g.set("request_id",e);this._addRequest(m,e,{background:a.background,offset:o-1,rlist:l});this.opts.ajaxRequest(h,this.addRequestParams(g,{noslice:true,view:m}));this._handleWait();this.isbusy=false},_getSliceBounds:function(c,d,a){var e=this._getBuffer(a).bufferSize(),b={};switch(d){case"bottom":b.start=c+this.getPageSize();b.end=b.start+e;break;case"top":b.start=Math.max(c-e,1);b.end=c;break;default:b.start=Math.max(c-this._lookbehind(a),1);b.end=b.start+e;break}return b},_lookbehind:function(a){return parseInt(0.4*this._getBuffer(a).bufferSize(),10)},addRequestParams:function(a,c){c=c||{};var f=this.getMetaData("cacheid",c.view),b,d,e;if(this.isFiltering()){d=this.filter.addFilterParams().merge({view:this.isFiltering()})}else{d=this.opts.additionalParams?this.opts.additionalParams(c.view||this.view):$H();d.update({view:c.view||this.view})}if(f){d.update({cacheid:f})}if(!c.noslice){e=this._getSliceBounds(this.currentOffset(),null,c.view);d.update({slice:e.start+":"+e.end})}if(this.opts.onCachedList){b=this.opts.onCachedList(c.view||this.view)}else{b=this._getBuffer(c.view).getAllUIDs();b=b.size()?b.toJSON():""}if(b.length){d.update({cached:b})}return d.merge(a)},ajaxResponse:function(d){if(this.isbusy){this.ajaxResponse.bind(this,d).defer();return}this.isbusy=true;this._clearWait();var a,b,e=(d.request_id)?this.current_req_lookup.get(d.request_id):d.id,c=this.current_req.get(e);if(c&&d.request_id){b=c.get(d.request_id)}if(this.viewport_init){this.viewport_init=2}a=this._getBuffer(e);a.update(Object.isArray(d.data)?{}:d.data,Object.isArray(d.rowlist)?{}:d.rowlist,d.metadata||{},{partial:d.partial,reset:d.reset,resetmd:d.resetmd,update:d.update});if(!d.partial){a.setMetaData({cacheid:d.cacheid,label:d.label,total_rows:d.totalrows},true)}if(this.opts.onCacheUpdate){this.opts.onCacheUpdate(e)}if(d.request_id){this._removeRequest(e,d.request_id)}this.isbusy=false;if(d.partial){this.select(this.getViewportSelection(e))}else{if(!(this.view==e||d.search)||(b&&b.background)||!this._updateContent((b&&b.offset)?b.offset:(d.rownum?parseInt(d.rownum)-1:this.currentOffset()))){return}if(this.opts.onComplete){this.opts.onComplete()}}if(this.opts.onEndFetch){this.opts.onEndFetch()}},_addRequest:function(a,b,e){var d=this.current_req.get(a),c;if(!d){d=this.current_req.set(a,$H())}c=d.get(b);if(!c){c=d.set(b,{count:1})}["background","offset","rlist"].each(function(f){if(!Object.isUndefined(e[f])){c[f]=e[f]}});this.current_req_lookup.set(b,a)},_removeRequest:function(a,b){var c=this.current_req.get(a);if(c){c.unset(b);if(!c.size()){this.current_req.unset(a)}}this.current_req_lookup.unset(b)},_updateContent:function(g,d){d=d||{};if(!this._getBuffer(d.view).sliceLoaded(g)){this._fetchBuffer($H(d).merge({offset:g}).toObject());return false}if(!this.uc_run){this.uc_run=true;if(this.opts.onFirstContent){this.opts.onFirstContent()}}var h=this.opts.content,a=[],b=this.getPageSize(),f,e=this.getSelected();if(this.opts.onClearRows){this.opts.onClearRows(h.childElements())}this.scroller.updateSize();this.scrollTo(g+1,{noupdate:true,top:true});g=this.currentOffset();f=this.createSelection("rownum",$A($R(g+1,g+b)));if(f.size()){f.get("dataob").each(function(i){var c=Object.clone(i);if(c.bg){c.bg=i.bg.clone();if(e.contains("uid",c.vp_id)){c.bg.push(this.opts.selected_class)}c.bg_string=c.bg.join(" ")}a.push(this.template.evaluate(c))},this);h.update(a.join(""));if(this.opts.onUpdateClass){f.get("div").each(function(c){this.opts.onUpdateClass(c)},this)}}else{h.update((this.opts.empty&&this.viewport_init!=1)?this.opts.empty.innerHTML:"")}if(this.opts.onContent){this.opts.onContent(f)}return true},_displayFetchError:function(){if(this.opts.onFail){this.opts.onFail()}if(this.opts.error){this.opts.content.update(this.opts.error.innerHTML)}},_handleWait:function(a){this._clearWait();if(a&&this.opts.onWait){this.opts.onWait()}if(this.opts.viewport_wait){this.waitHandler=this._handleWait.bind(this,true).delay(this.opts.viewport_wait)}},_clearWait:function(){if(this.waitHandler){clearTimeout(this.waitHandler);this.waitHandler=null}},visibleRows:function(){return this.opts.content.childElements()},getMetaData:function(b,a){return this._getBuffer(a).getMetaData(b)},setMetaData:function(b,a){this._getBuffer(a).setMetaData(b,false)},_getBuffer:function(c,d){c=c||this.view;if(!d){var a=this.views.get(c);if(a){return a.buffer}}return new ViewPort_Buffer(this,this.opts.buffer_pages,this.opts.limit_factor,c)},currentOffset:function(){return this.scroller.currentOffset()},updateFlag:function(c,a,b){this._updateFlag(c,a,b,this.isFiltering());this._updateClass(c,a,b)},_updateFlag:function(d,a,c,b){d.get("dataob").each(function(e){if(c){e.bg.push(a)}else{e.bg.splice(e.bg.indexOf(a),1)}if(b){this._updateFlag(this.createSelection("uid",e.vp_id,e.view),a,c)}},this)},_updateClass:function(c,a,b){c.get("div").each(function(e){if(b){e.addClassName(a)}else{e.removeClassName(a)}if(this.opts.onUpdateClass){this.opts.onUpdateClass(e)}},this)},_getLineHeight:function(){if(this.line_height){return this.line_height}var a=new Element("DIV",{className:this.opts.content_class}).insert(new Element("DIV",{className:this.opts.row_class})).hide();$(document.body).insert(a);this.line_height=a.getHeight();a.remove();return this.line_height},getPageSize:function(a){switch(a){case"current":return Math.min(this.page_size,this.getMetaData("total_rows"));case"default":return Math.max(parseInt(this.getPageSize("max")*0.45),5);case"max":return parseInt(this._getMaxHeight()/this._getLineHeight());default:return this.page_size}},_getMaxHeight:function(){return document.viewport.getHeight()-this.opts.content.viewportOffset()[1]},showSplitPane:function(a){this.show_split_pane=a;this.onResize(false,true)},_renderViewport:function(e){if(!this.viewport_init){return}if(!this.opts.content.offsetHeight){return this._renderViewport.bind(this,e).defer()}var f,b,j,d,i=$(this.opts.content),g=document.documentElement,a=this._getLineHeight();if(this.opts.split_pane){j=$(this.opts.split_pane);if(this.show_split_pane){if(!j.visible()){this._initSplitBar();this.page_size=(this.splitbar_loc)?this.splitbar_loc:this.getPageSize("default")}d=true}else{if(j.visible()){this.splitbar_loc=this.page_size;$(j,this.splitbar).invoke("hide")}}}if(!d){this.page_size=this.getPageSize("max")}b=a*this.page_size;i.setStyle({height:b+"px"});if(d){j.setStyle({height:(this._getMaxHeight()-b-a)+"px"}).show();this.splitbar.show()}else{if(f=g.scrollHeight-g.clientHeight){i.setStyle({height:(a*(this.page_size-1))+"px"})}}if(!e){this.scroller.onResize()}},_initSplitBar:function(){if(this.splitbar){return}this.splitbar=$(this.opts.splitbar);new Drag(this.splitbar,{constraint:"vertical",ghosting:true,onStart:function(){var a=this._getLineHeight();this.sp={lh:a,pos:$(this.opts.content).positionedOffset()[1],max:parseInt((this._getMaxHeight()-100)/a),lines:this.page_size}}.bind(this),snap:function(a,d,c){var b=parseInt((d-this.sp.pos)/this.sp.lh);if(b<1){b=1}else{if(b>this.sp.max){b=this.sp.max}}this.sp.lines=b;return[a,this.sp.pos+(b*this.sp.lh)]}.bind(this),onEnd:function(){this.page_size=this.sp.lines;this._renderViewport()}.bind(this)});this.splitbar.observe("dblclick",function(){this.page_size=this.getPageSize("default");this._renderViewport()}.bind(this))},createSelection:function(d,c,b){var a=this._getBuffer(b);return a?new ViewPort_Selection(a,d,c):new ViewPort_Selection(this._getBuffer(this.view))},getViewportSelection:function(b,c){var a=this._getBuffer(b);return this.createSelection("uid",a?a.getAllUIDs(c):[],b)},select:function(f,c){c=c||{};var a=this._getBuffer(),d,e;if(c.range){e=this.createSelection("rownum",f);if(f.size()!=e.size()){this._fetchBuffer({offset:this.currentOffset(),params:{rangeslice:1},rowlist:{start:f.min(),end:f.size()}});return}f=e}if(!c.add){d=this.getSelected();a.deselect(d,true);this._updateClass(d,this.opts.selected_class,false)}a.select(f);this._updateClass(f,this.opts.selected_class,true);if(this.opts.selectCallback){this.opts.selectCallback(f,c)}},deselect:function(b,a){a=a||{};if(!b.size()){return}if(this._getBuffer().deselect(b,a&&a.clearall)){this._updateClass(b,this.opts.selected_class,false);if(this.opts.deselectCallback){this.opts.deselectCallback(b,a)}}},getSelected:function(){return Object.clone(this._getBuffer().getSelected())}}),ViewPort_Scroller=Class.create({initialize:function(a){this.vp=a},_createScrollBar:function(){if(this.scrollDiv){return false}var a=this.vp.opts.content;this.scrollDiv=new Element("DIV",{className:"sbdiv",style:"height:"+a.getHeight()+"px;"}).hide();a.insert({after:this.scrollDiv}).setStyle({marginRight:"-"+this.scrollDiv.getWidth()+"px"});this.scrollbar=new DimpSlider(this.scrollDiv,{buttonclass:{up:"sbup",down:"sbdown"},cursorclass:"sbcursor",onChange:this._onScroll.bind(this),onSlide:this.vp.opts.onSlide?this.vp.opts.onSlide:null,pagesize:this.vp.getPageSize(),totalsize:this.vp.getMetaData("total_rows")});a.observe(Prototype.Browser.Gecko?"DOMMouseScroll":"mousewheel",function(c){if(Prototype.Browser.Gecko&&c.eventPhase==2){return}var b=this.vp.getPageSize();b=(b>3)?3:b;this.moveScroll(this.currentOffset()+((c.wheelDelta>=0||c.detail<0)?(-1*b):b))}.bindAsEventListener(this));return true},onResize:function(){if(!this.scrollDiv){return}this.scrollsize=this.vp.opts.content.getHeight();this.scrollDiv.setStyle({height:this.scrollsize+"px"});this.updateSize();this.vp.requestContentRefresh(this.currentOffset())},updateSize:function(){if(!this._createScrollBar()){this.scrollbar.updateHandleLength(this.vp.getPageSize(),this.vp.getMetaData("total_rows"))}},clear:function(){if(this.scrollDiv){this.scrollbar.updateHandleLength(0,0)}},moveScroll:function(a){this._createScrollBar();this.scrollbar.setScrollPosition(a)},_onScroll:function(){if(!this.noupdate){if(this.vp.opts.onScroll){this.vp.opts.onScroll()}this.vp.requestContentRefresh(this.currentOffset());if(this.vp.opts.onScrollIdle){this.vp.opts.onScrollIdle()}}},currentOffset:function(){return this.scrollbar?this.scrollbar.getValue():0}}),ViewPort_Buffer=Class.create({initialize:function(c,d,b,a){this.bufferPages=d;this.limitFactor=b;this.vp=c;this.view=a;this.clear()},getView:function(){return this.view},_limitTolerance:function(){return Math.round(this.bufferSize()*(this.limitFactor/100))},bufferSize:function(){return Math.round(Math.max(this.vp.getPageSize("max")+1,this.bufferPages*this.vp.getPageSize()))},update:function(f,a,c,b){var e;f=$H(f);a=$H(a);b=b||{};if(!b.reset&&this.data.size()){this.data.update(f);if(b.partial||this.partial.size()){f.keys().each(function(d){if(b.partial){this.partial.set(d,true)}else{this.partial.unset(d)}},this)}}else{this.data=f}if(b.update||b.reset){this.uidlist=a;this.rowlist=$H()}else{this.uidlist=this.uidlist.size()?this.uidlist.merge(a):a}a.each(function(d){this.rowlist.set(d.value,d.key)},this);if(b.resetmd){this.usermdata=$H(c)}else{$H(c).each(function(d){if(Object.isString(d.value)||Object.isNumber(d.value)){this.usermdata.set(d.key,d.value)}else{e=this.usermdata.get(d.key);if(e){this.usermdata.get(d.key).update($H(d.value))}else{this.usermdata.set(d.key,$H(d.value))}}},this)}},sliceLoaded:function(a){return!this._rangeCheck($A($R(a+1,Math.min(a+this.vp.getPageSize()-1,this.getMetaData("total_rows")))))},isNearingLimit:function(a){if(this.uidlist.size()!=this.getMetaData("total_rows")){if(a!=0&&this._rangeCheck($A($R(Math.max(a+1-this._limitTolerance(),1),a)))){return"top"}else{if(this._rangeCheck($A($R(a+1,Math.min(a+this._limitTolerance()+this.vp.getPageSize()-1,this.getMetaData("total_rows")))).reverse())){return"bottom"}}}return false},_rangeCheck:function(a){var b=this.partial.size();return a.any(function(d){var c=this.rowlist.get(d);return(Object.isUndefined(c)||(b&&this.partial.get(c)))},this)},getData:function(a){return a.collect(function(b){var c=this.data.get(b);if(!Object.isUndefined(c)){c.domid="vp_row"+b;c.rownum=this.uidlist.get(b);c.vp_id=b;return c}},this).compact()},getAllUIDs:function(b){var a=this.uidlist.keys();return b?a.diff(this.partial.keys()):a},getAllRows:function(b){var a=this.rowlist.keys();return b?this.rowsToUIDs(a,true):a},rowsToUIDs:function(b,a){return b.collect(function(d){var c=this.rowlist.get(d);return a?((this.partial.get(c))?null:c):c},this).compact()},select:function(a){this.selected.add("uid",a.get("uid"))},deselect:function(c,b){var a=this.selected.size();if(b){this.selected.clear()}else{this.selected.remove("uid",c.get("uid"))}return a!=this.selected.size()},getSelected:function(){return this.selected},remove:function(b){var c=b.min(),d,e=this.rowlist.size(),a=0;d=e-b.size();return this.rowlist.keys().each(function(h){if(h>=c){var g=this.rowlist.get(h),f;if(b.include(h)){this.data.unset(g);this.uidlist.unset(g);a++}else{if(a){f=h-a;this.rowlist.set(f,g);this.uidlist.set(g,f)}}if(h>d){this.rowlist.unset(h)}}},this)},clear:function(){this.data=$H();this.partial=$H();this.mdata=$H({total_rows:0});this.usermdata=$H();this.rowlist=$H();this.selected=new ViewPort_Selection(this);this.uidlist=$H()},getMetaData:function(a){return this.mdata.get(a)||this.usermdata.get(a)},setMetaData:function(b,a){if(a){this.mdata.update(b)}else{this.usermdata.update(b)}}}),ViewPort_Filter=Class.create({initialize:function(a,b,c){this.vp=a;this.action=b;this.callback=c;this.filtering=this.last_filter=this.last_folder=null},filter:function(d,b){b=b||{};if(d===null){d=this.last_filter}else{d=d.toLowerCase();if(d==this.last_filter){return}}if(!d){this.clear();return}this.last_filter=d;if(this.filtering){this.vp._fetchBuffer({offset:0,params:b});return}this.filtering=true;this.last_folder=this.vp.view;var e=this.vp.opts.content,a;a=e.childElements().findAll(function(c){return c.collectTextNodes().toLowerCase().indexOf(d)==-1});if(this.vp.opts.onClearRows){this.vp.opts.onClearRows(a)}a.invoke("remove");this.vp.scroller.clear();if(this.vp.opts.empty&&!e.childElements().size()){e.update(this.vp.opts.empty.innerHTML)}this.vp.loadView("%%filter%%")},isFiltering:function(){return this.filtering?this.last_folder:false},getAction:function(){return this.action},addFilterParams:function(){if(!this.filtering){return $H()}var a=$H({filter:this.last_filter});if(this.callback){a.update(this.callback())}return a},clear:function(a){if(this.filtering){this.filtering=null;if(!a){this.vp.loadView(this.last_folder)}this.vp.deleteView("%%filter%%");this.last_filter=this.last_folder=null}}}),ViewPort_Selection=Class.create({initialize:function(a,c,b){this.buffer=a;this.clear();if(!Object.isUndefined(c)){this.add(c,b)}this.viewport_selection=true},add:function(a,b){var e=this._convert(a,b);this.data=(this.data.size())?this.data.concat(e).uniq():e},remove:function(a,b){this.data=this.data.diff(this._convert(a,b))},_convert:function(a,b){b=Object.isArray(b)?b:[b];switch(a){case"dataob":return b.pluck("vp_id");case"div":return b.pluck("id").invoke("substring",6);case"domid":return b.invoke("substring",6);case"rownum":return this.buffer.rowsToUIDs(b);case"uid":return b}},clear:function(){this.data=[]},get:function(a){a=Object.isUndefined(a)?"uid":a;if(a=="uid"){return this.data}var b=this.buffer.getData(this.data);switch(a){case"dataob":return b;case"div":return b.pluck("domid").collect(function(c){return $(c)}).compact();case"domid":return b.pluck("domid");case"rownum":return b.pluck("rownum")}},contains:function(a,b){return this.data.include(this._convert(a,b).first())},search:function(a){return new ViewPort_Selection(this.buffer,"uid",this.get("dataob").findAll(function(b){return $H(a).all(function(c){return $H(c.value).all(function(d){switch(d.key){case"equal":case"not":var e=b[c.key]&&d.value.include(b[c.key]);return(d.key=="equal")?e:!e;case"regex":return b[c.key].match(d.value)}})})}).pluck("vp_id"))},size:function(){return this.data.size()},set:function(a){this.get("dataob").each(function(b){$H(a).each(function(c){b[c.key]=c.value})})},getBuffer:function(){return this.buffer}});Object.extend(Array.prototype,{diff:function(a){return this.select(function(b){return!a.include(b)})},numericSort:function(){return this.collect(Number).sort(function(d,c){return(d>c)?1:((d<c)?-1:0)})}});