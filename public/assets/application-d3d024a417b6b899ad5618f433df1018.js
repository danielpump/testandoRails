(function($, undefined) {

/**
 * Unobtrusive scripting adapter for jQuery
 * https://github.com/rails/jquery-ujs
 *
 * Requires jQuery 1.8.0 or later.
 *
 * Released under the MIT license
 *
 */

  // Cut down on the number of issues from people inadvertently including jquery_ujs twice
  // by detecting and raising an error when it happens.
  if ( $.rails !== undefined ) {
    $.error('jquery-ujs has already been loaded!');
  }

  // Shorthand to make it a little easier to call public rails functions from within rails.js
  var rails;
  var $document = $(document);

  $.rails = rails = {
    // Link elements bound by jquery-ujs
    linkClickSelector: 'a[data-confirm], a[data-method], a[data-remote], a[data-disable-with], a[data-disable]',

    // Button elements bound by jquery-ujs
    buttonClickSelector: 'button[data-remote]:not(form button), button[data-confirm]:not(form button)',

    // Select elements bound by jquery-ujs
    inputChangeSelector: 'select[data-remote], input[data-remote], textarea[data-remote]',

    // Form elements bound by jquery-ujs
    formSubmitSelector: 'form',

    // Form input elements bound by jquery-ujs
    formInputClickSelector: 'form input[type=submit], form input[type=image], form button[type=submit], form button:not([type]), input[type=submit][form], input[type=image][form], button[type=submit][form], button[form]:not([type])',

    // Form input elements disabled during form submission
    disableSelector: 'input[data-disable-with]:enabled, button[data-disable-with]:enabled, textarea[data-disable-with]:enabled, input[data-disable]:enabled, button[data-disable]:enabled, textarea[data-disable]:enabled',

    // Form input elements re-enabled after form submission
    enableSelector: 'input[data-disable-with]:disabled, button[data-disable-with]:disabled, textarea[data-disable-with]:disabled, input[data-disable]:disabled, button[data-disable]:disabled, textarea[data-disable]:disabled',

    // Form required input elements
    requiredInputSelector: 'input[name][required]:not([disabled]),textarea[name][required]:not([disabled])',

    // Form file input elements
    fileInputSelector: 'input[type=file]',

    // Link onClick disable selector with possible reenable after remote submission
    linkDisableSelector: 'a[data-disable-with], a[data-disable]',

    // Button onClick disable selector with possible reenable after remote submission
    buttonDisableSelector: 'button[data-remote][data-disable-with], button[data-remote][data-disable]',

    // Make sure that every Ajax request sends the CSRF token
    CSRFProtection: function(xhr) {
      var token = $('meta[name="csrf-token"]').attr('content');
      if (token) xhr.setRequestHeader('X-CSRF-Token', token);
    },

    // making sure that all forms have actual up-to-date token(cached forms contain old one)
    refreshCSRFTokens: function(){
      var csrfToken = $('meta[name=csrf-token]').attr('content');
      var csrfParam = $('meta[name=csrf-param]').attr('content');
      $('form input[name="' + csrfParam + '"]').val(csrfToken);
    },

    // Triggers an event on an element and returns false if the event result is false
    fire: function(obj, name, data) {
      var event = $.Event(name);
      obj.trigger(event, data);
      return event.result !== false;
    },

    // Default confirm dialog, may be overridden with custom confirm dialog in $.rails.confirm
    confirm: function(message) {
      return confirm(message);
    },

    // Default ajax function, may be overridden with custom function in $.rails.ajax
    ajax: function(options) {
      return $.ajax(options);
    },

    // Default way to get an element's href. May be overridden at $.rails.href.
    href: function(element) {
      return element.attr('href');
    },

    // Submits "remote" forms and links with ajax
    handleRemote: function(element) {
      var method, url, data, elCrossDomain, crossDomain, withCredentials, dataType, options;

      if (rails.fire(element, 'ajax:before')) {
        elCrossDomain = element.data('cross-domain');
        crossDomain = elCrossDomain === undefined ? null : elCrossDomain;
        withCredentials = element.data('with-credentials') || null;
        dataType = element.data('type') || ($.ajaxSettings && $.ajaxSettings.dataType);

        if (element.is('form')) {
          method = element.attr('method');
          url = element.attr('action');
          data = element.serializeArray();
          // memoized value from clicked submit button
          var button = element.data('ujs:submit-button');
          if (button) {
            data.push(button);
            element.data('ujs:submit-button', null);
          }
        } else if (element.is(rails.inputChangeSelector)) {
          method = element.data('method');
          url = element.data('url');
          data = element.serialize();
          if (element.data('params')) data = data + "&" + element.data('params');
        } else if (element.is(rails.buttonClickSelector)) {
          method = element.data('method') || 'get';
          url = element.data('url');
          data = element.serialize();
          if (element.data('params')) data = data + "&" + element.data('params');
        } else {
          method = element.data('method');
          url = rails.href(element);
          data = element.data('params') || null;
        }

        options = {
          type: method || 'GET', data: data, dataType: dataType,
          // stopping the "ajax:beforeSend" event will cancel the ajax request
          beforeSend: function(xhr, settings) {
            if (settings.dataType === undefined) {
              xhr.setRequestHeader('accept', '*/*;q=0.5, ' + settings.accepts.script);
            }
            if (rails.fire(element, 'ajax:beforeSend', [xhr, settings])) {
              element.trigger('ajax:send', xhr);
            } else {
              return false;
            }
          },
          success: function(data, status, xhr) {
            element.trigger('ajax:success', [data, status, xhr]);
          },
          complete: function(xhr, status) {
            element.trigger('ajax:complete', [xhr, status]);
          },
          error: function(xhr, status, error) {
            element.trigger('ajax:error', [xhr, status, error]);
          },
          crossDomain: crossDomain
        };

        // There is no withCredentials for IE6-8 when
        // "Enable native XMLHTTP support" is disabled
        if (withCredentials) {
          options.xhrFields = {
            withCredentials: withCredentials
          };
        }

        // Only pass url to `ajax` options if not blank
        if (url) { options.url = url; }

        return rails.ajax(options);
      } else {
        return false;
      }
    },

    // Handles "data-method" on links such as:
    // <a href="/users/5" data-method="delete" rel="nofollow" data-confirm="Are you sure?">Delete</a>
    handleMethod: function(link) {
      var href = rails.href(link),
        method = link.data('method'),
        target = link.attr('target'),
        csrfToken = $('meta[name=csrf-token]').attr('content'),
        csrfParam = $('meta[name=csrf-param]').attr('content'),
        form = $('<form method="post" action="' + href + '"></form>'),
        metadataInput = '<input name="_method" value="' + method + '" type="hidden" />';

      if (csrfParam !== undefined && csrfToken !== undefined) {
        metadataInput += '<input name="' + csrfParam + '" value="' + csrfToken + '" type="hidden" />';
      }

      if (target) { form.attr('target', target); }

      form.hide().append(metadataInput).appendTo('body');
      form.submit();
    },

    // Helper function that returns form elements that match the specified CSS selector
    // If form is actually a "form" element this will return associated elements outside the from that have
    // the html form attribute set
    formElements: function(form, selector) {
      return form.is('form') ? $(form[0].elements).filter(selector) : form.find(selector);
    },

    /* Disables form elements:
      - Caches element value in 'ujs:enable-with' data store
      - Replaces element text with value of 'data-disable-with' attribute
      - Sets disabled property to true
    */
    disableFormElements: function(form) {
      rails.formElements(form, rails.disableSelector).each(function() {
        rails.disableFormElement($(this));
      });
    },

    disableFormElement: function(element) {
      var method, replacement;

      method = element.is('button') ? 'html' : 'val';
      replacement = element.data('disable-with');

      element.data('ujs:enable-with', element[method]());
      if (replacement !== undefined) {
        element[method](replacement);
      }

      element.prop('disabled', true);
    },

    /* Re-enables disabled form elements:
      - Replaces element text with cached value from 'ujs:enable-with' data store (created in `disableFormElements`)
      - Sets disabled property to false
    */
    enableFormElements: function(form) {
      rails.formElements(form, rails.enableSelector).each(function() {
        rails.enableFormElement($(this));
      });
    },

    enableFormElement: function(element) {
      var method = element.is('button') ? 'html' : 'val';
      if (element.data('ujs:enable-with')) element[method](element.data('ujs:enable-with'));
      element.prop('disabled', false);
    },

   /* For 'data-confirm' attribute:
      - Fires `confirm` event
      - Shows the confirmation dialog
      - Fires the `confirm:complete` event

      Returns `true` if no function stops the chain and user chose yes; `false` otherwise.
      Attaching a handler to the element's `confirm` event that returns a `falsy` value cancels the confirmation dialog.
      Attaching a handler to the element's `confirm:complete` event that returns a `falsy` value makes this function
      return false. The `confirm:complete` event is fired whether or not the user answered true or false to the dialog.
   */
    allowAction: function(element) {
      var message = element.data('confirm'),
          answer = false, callback;
      if (!message) { return true; }

      if (rails.fire(element, 'confirm')) {
        answer = rails.confirm(message);
        callback = rails.fire(element, 'confirm:complete', [answer]);
      }
      return answer && callback;
    },

    // Helper function which checks for blank inputs in a form that match the specified CSS selector
    blankInputs: function(form, specifiedSelector, nonBlank) {
      var inputs = $(), input, valueToCheck,
          selector = specifiedSelector || 'input,textarea',
          allInputs = form.find(selector);

      allInputs.each(function() {
        input = $(this);
        valueToCheck = input.is('input[type=checkbox],input[type=radio]') ? input.is(':checked') : input.val();
        // If nonBlank and valueToCheck are both truthy, or nonBlank and valueToCheck are both falsey
        if (!valueToCheck === !nonBlank) {

          // Don't count unchecked required radio if other radio with same name is checked
          if (input.is('input[type=radio]') && allInputs.filter('input[type=radio]:checked[name="' + input.attr('name') + '"]').length) {
            return true; // Skip to next input
          }

          inputs = inputs.add(input);
        }
      });
      return inputs.length ? inputs : false;
    },

    // Helper function which checks for non-blank inputs in a form that match the specified CSS selector
    nonBlankInputs: function(form, specifiedSelector) {
      return rails.blankInputs(form, specifiedSelector, true); // true specifies nonBlank
    },

    // Helper function, needed to provide consistent behavior in IE
    stopEverything: function(e) {
      $(e.target).trigger('ujs:everythingStopped');
      e.stopImmediatePropagation();
      return false;
    },

    //  replace element's html with the 'data-disable-with' after storing original html
    //  and prevent clicking on it
    disableElement: function(element) {
      var replacement = element.data('disable-with');

      element.data('ujs:enable-with', element.html()); // store enabled state
      if (replacement !== undefined) {
        element.html(replacement);
      }

      element.bind('click.railsDisable', function(e) { // prevent further clicking
        return rails.stopEverything(e);
      });
    },

    // restore element to its original state which was disabled by 'disableElement' above
    enableElement: function(element) {
      if (element.data('ujs:enable-with') !== undefined) {
        element.html(element.data('ujs:enable-with')); // set to old enabled state
        element.removeData('ujs:enable-with'); // clean up cache
      }
      element.unbind('click.railsDisable'); // enable element
    }
  };

  if (rails.fire($document, 'rails:attachBindings')) {

    $.ajaxPrefilter(function(options, originalOptions, xhr){ if ( !options.crossDomain ) { rails.CSRFProtection(xhr); }});

    $document.delegate(rails.linkDisableSelector, 'ajax:complete', function() {
        rails.enableElement($(this));
    });

    $document.delegate(rails.buttonDisableSelector, 'ajax:complete', function() {
        rails.enableFormElement($(this));
    });

    $document.delegate(rails.linkClickSelector, 'click.rails', function(e) {
      var link = $(this), method = link.data('method'), data = link.data('params'), metaClick = e.metaKey || e.ctrlKey;
      if (!rails.allowAction(link)) return rails.stopEverything(e);

      if (!metaClick && link.is(rails.linkDisableSelector)) rails.disableElement(link);

      if (link.data('remote') !== undefined) {
        if (metaClick && (!method || method === 'GET') && !data) { return true; }

        var handleRemote = rails.handleRemote(link);
        // response from rails.handleRemote() will either be false or a deferred object promise.
        if (handleRemote === false) {
          rails.enableElement(link);
        } else {
          handleRemote.error( function() { rails.enableElement(link); } );
        }
        return false;

      } else if (link.data('method')) {
        rails.handleMethod(link);
        return false;
      }
    });

    $document.delegate(rails.buttonClickSelector, 'click.rails', function(e) {
      var button = $(this);

      if (!rails.allowAction(button)) return rails.stopEverything(e);

      if (button.is(rails.buttonDisableSelector)) rails.disableFormElement(button);

      var handleRemote = rails.handleRemote(button);
      // response from rails.handleRemote() will either be false or a deferred object promise.
      if (handleRemote === false) {
        rails.enableFormElement(button);
      } else {
        handleRemote.error( function() { rails.enableFormElement(button); } );
      }
      return false;
    });

    $document.delegate(rails.inputChangeSelector, 'change.rails', function(e) {
      var link = $(this);
      if (!rails.allowAction(link)) return rails.stopEverything(e);

      rails.handleRemote(link);
      return false;
    });

    $document.delegate(rails.formSubmitSelector, 'submit.rails', function(e) {
      var form = $(this),
        remote = form.data('remote') !== undefined,
        blankRequiredInputs,
        nonBlankFileInputs;

      if (!rails.allowAction(form)) return rails.stopEverything(e);

      // skip other logic when required values are missing or file upload is present
      if (form.attr('novalidate') == undefined) {
        blankRequiredInputs = rails.blankInputs(form, rails.requiredInputSelector);
        if (blankRequiredInputs && rails.fire(form, 'ajax:aborted:required', [blankRequiredInputs])) {
          return rails.stopEverything(e);
        }
      }

      if (remote) {
        nonBlankFileInputs = rails.nonBlankInputs(form, rails.fileInputSelector);
        if (nonBlankFileInputs) {
          // slight timeout so that the submit button gets properly serialized
          // (make it easy for event handler to serialize form without disabled values)
          setTimeout(function(){ rails.disableFormElements(form); }, 13);
          var aborted = rails.fire(form, 'ajax:aborted:file', [nonBlankFileInputs]);

          // re-enable form elements if event bindings return false (canceling normal form submission)
          if (!aborted) { setTimeout(function(){ rails.enableFormElements(form); }, 13); }

          return aborted;
        }

        rails.handleRemote(form);
        return false;

      } else {
        // slight timeout so that the submit button gets properly serialized
        setTimeout(function(){ rails.disableFormElements(form); }, 13);
      }
    });

    $document.delegate(rails.formInputClickSelector, 'click.rails', function(event) {
      var button = $(this);

      if (!rails.allowAction(button)) return rails.stopEverything(event);

      // register the pressed submit button
      var name = button.attr('name'),
        data = name ? {name:name, value:button.val()} : null;

      button.closest('form').data('ujs:submit-button', data);
    });

    $document.delegate(rails.formSubmitSelector, 'ajax:send.rails', function(event) {
      if (this == event.target) rails.disableFormElements($(this));
    });

    $document.delegate(rails.formSubmitSelector, 'ajax:complete.rails', function(event) {
      if (this == event.target) rails.enableFormElements($(this));
    });

    $(function(){
      rails.refreshCSRFTokens();
    });
  }

})( jQuery );
/**
* Metis - Bootstrap-Admin-Template v2.3.2
* Author : onokumus 
* Copyright 2015
* Licensed under MIT (https://github.com/onokumus/Bootstrap-Admin-Template/blob/master/LICENSE.md)
*/


!function(a){var b="undefined"!=typeof b?b:!1,c=b?b.touch:!!("ontouchstart"in a||"onmsgesturechange"in a),d=c?"touchstart":"click",e=function(){this.init()};e.prototype.init=function(){this.isTouchDevice=c,this.buttonPressedEvent=d},e.prototype.getViewportHeight=function(){var b=document.documentElement,c=b.clientHeight,d=a.innerHeight;return d>c?d:c},e.prototype.getViewportWidth=function(){var b=document.documentElement,c=b.clientWidth,d=a.innerWidth;return d>c?d:c},a.Metis=new e}(this),function(a){"use strict";function b(){var b=c.hasClass("navbar-fixed-top"),f=b?c.outerHeight(!0):0;d.css("padding-top",f),d.hasClass("menu-affix")&&(e.affix({offset:{top:e.offset().top}}).css({height:function(){return a(window).width()<768,a(window).height()},top:f-1,bottom:0}),console.log(c.outerHeight(!0)))}var c=a("nav.navbar"),d=a("body"),e=a("#menu");return Metis.navBar=function(){var c;b(),a(window).resize(function(){clearTimeout(c),c=setTimeout(b(),250)})},Metis}(jQuery),function(a,b){"use strict";return b.toggleFullScreen=function(){void 0!==window.screenfull&&screenfull.enabled?a("#toggleFullScreen").on(b.buttonPressedEvent,function(b){screenfull.toggle(window.document[0]),a("body").toggleClass("fullScreen"),b.preventDefault()}):a("#toggleFullScreen").addClass("hidden")},b.boxFullScreen=function(){void 0!==window.screenfull&&screenfull.enabled?a(".full-box").on(b.buttonPressedEvent,function(b){var c=a(this).parents(".box")[0];screenfull.toggle(c),a(this).parents(".box").toggleClass("full-screen-box"),a(this).parents(".box").children(".body").toggleClass("full-screen-box"),a(this).children("i").toggleClass("fa-compress"),b.preventDefault()}):a(".full-box").addClass("hidden")},b.panelBodyCollapse=function(){var c=a(".collapse-box"),d=c.closest(".box").children(".body");d.collapse("show"),c.on(b.buttonPressedEvent,function(b){var c=a(this).closest(".box").children(".body"),d=a(this).children("i");c.on("show.bs.collapse",function(){d.removeClass("fa-minus fa-plus").addClass("fa-spinner fa-spin")}),c.on("shown.bs.collapse",function(){d.removeClass("fa-spinner fa-spin").addClass("fa-minus")}),c.on("hide.bs.collapse",function(){d.removeClass("fa-minus fa-plus").addClass("fa-spinner fa-spin")}),c.on("hidden.bs.collapse",function(){d.removeClass("fa-spinner fa-spin").addClass("fa-plus")}),c.collapse("toggle"),b.preventDefault()})},b.boxHiding=function(){a(".close-box").on(b.buttonPressedEvent,function(){a(this).closest(".box").hide("slow")})},b}(jQuery,Metis||{}),function(a,b){var c=a("body"),d=a(".toggle-left"),e=a(".toggle-right");return b.metisAnimatePanel=function(){a("#left").length?d.on(b.buttonPressedEvent,function(b){if(a(window).width()<768)c.toggleClass("sidebar-left-opened");else{switch(!0){case c.hasClass("sidebar-left-hidden"):c.removeClass("sidebar-left-hidden sidebar-left-mini");break;case c.hasClass("sidebar-left-mini"):c.removeClass("sidebar-left-mini").addClass("sidebar-left-hidden");break;default:c.addClass("sidebar-left-mini")}b.preventDefault()}}):d.addClass("hidden"),a("#right").length?e.on(b.buttonPressedEvent,function(a){switch(!0){case c.hasClass("sidebar-right-opened"):c.removeClass("sidebar-right-opened");break;default:c.addClass("sidebar-right-opened"),!c.hasClass("sidebar-left-mini")&!c.hasClass("sidebar-left-hidden")&&c.addClass("sidebar-left-mini")}a.preventDefault()}):e.addClass("hidden")},b}(jQuery,Metis||{}),function(a){a(document).ready(function(){a('[data-toggle="tooltip"]').tooltip(),a("#menu").metisMenu(),Metis.navBar(),Metis.metisAnimatePanel(),Metis.toggleFullScreen(),Metis.boxFullScreen(),Metis.panelBodyCollapse(),Metis.boxHiding()})}(jQuery);
//# sourceMappingURL=core.js.map
;
/**
* Metis - Bootstrap-Admin-Template v2.3.2
* Author : onokumus 
* Copyright 2015
* Licensed under MIT (https://github.com/onokumus/Bootstrap-Admin-Template/blob/master/LICENSE.md)
*/


!function(a,b){var c=a(".inner a.btn");return b.metisButton=function(){a.each(c,function(){a(this).popover({placement:"bottom",title:this.innerHTML,content:this.outerHTML,trigger:b.isTouchDevice?"touchstart":"hover"})})},b}(jQuery,Metis||{}),function(a,b){"use strict";function c(a){return Math.sqrt(2)*Math.cos(a)/(Math.pow(Math.sin(a),2)+1)}function d(a){return Math.sqrt(2)*Math.cos(a)*Math.sin(a)/(Math.pow(Math.sin(a),2)+1)}{var e=[[0,3],[1,8],[2,5],[3,13],[4,1]],f=[[0,12],[2,2],[3,9],[4,4]],g=[],h=[],i=[],j=[],k=[],l=a("#human"),m=a("#eye"),n=a("#bar");a("#heart"),a("#bernoilli")}return b.MetisChart=function(){if(!a().plot)throw new Error("flot plugin require form MetisChart");a.plot(l,[{data:e,label:"MAN"},{data:f,label:"WOMAN"}],{clickable:!0,hoverable:!0,series:{lines:{show:!0,fill:!0,fillColor:{colors:[{opacity:.5},{opacity:.15}]}},points:{show:!0}}}),a.plot(n,[{data:e,label:"BAR"}],{clickable:!0,hoverable:!0,series:{bars:{show:!0,barWidth:.6},points:{show:!0}}});for(var b=-5;5>=b;b+=.5)g.push([b,Math.pow(b,2)-25]),h.push([b,-Math.pow(b,2)+25]);for(var o=-2;2.1>=o;o+=.1)i.push([o,Math.sqrt(400-o*o*100)]),i.push([o,-Math.sqrt(400-o*o*100)]);for(a.plot(m,[{data:h,lines:{show:!0,fill:!0}},{data:g,lines:{show:!0,fill:!0}},{data:i,lines:{show:!0}}]),b=-2;5>=b;b+=.01)j.push([16*Math.pow(Math.sin(b),3),13*Math.cos(b)-5*Math.cos(2*b)-2*Math.cos(3*b)-Math.cos(4*b)]);a.plot(a("#heart"),[{data:j,label:'<i class="fa fa-heart"></i>',color:"#9A004D"}],{series:{lines:{show:!0,fill:!0},points:{show:!1}},yaxis:{show:!0},xaxis:{show:!0}}),a("#heart .legendLabel").addClass("animated pulse"),setInterval(function(){a("#heart .legendLabel .fa.fa-heart").toggleClass("fa-2x")},400);for(var p=0;p<=2*Math.PI;p+=.01)k.push([c(p),d(p)]);a.plot(a("#bernoilli"),[{data:k,label:"Lemniscate of Bernoulli",lines:{show:!0,fill:!0}}])},b}(jQuery,Metis||{}),function(a){"use strict";return Metis.dashboard=function(){function b(b,c,d){a('<div id="tooltip">'+d+"</div>").css({position:"absolute",display:"none",top:c+5,left:b+5,border:"1px solid #fdd",padding:"2px","background-color":"#000",color:"#fff"}).appendTo("body").fadeIn(200)}a(".inlinesparkline").sparkline();var c=[10,8,5,7,4,4,1];a(".dynamicsparkline").sparkline(c),a(".dynamicbar").sparkline(c,{type:"bar",barColor:"green"}),a(".inlinebar").sparkline("html",{type:"bar",barColor:"red"}),a(".sparkline.bar_week").sparkline([5,6,7,2,0,-4,-2,4],{type:"bar",height:"40",barWidth:5,barColor:"#4d6189",negBarColor:"#a20051"}),a(".sparkline.line_day").sparkline([5,6,7,9,9,5,4,6,6,4,6,7],{type:"line",height:"40",drawNormalOnTop:!1}),a(".sparkline.pie_week").sparkline([1,1,2],{type:"pie",width:"40",height:"40"}),a(".sparkline.stacked_month").sparkline(["0:2","2:4","4:2","4:1"],{type:"bar",height:"40",barWidth:10,barColor:"#4d6189",negBarColor:"#a20051"});for(var d=new Date,e=d.getDate(),f=d.getMonth(),g=d.getFullYear(),h=a("#calendar").fullCalendar({header:{left:"prev,today,next,",center:"title",right:"month,agendaWeek,agendaDay"},selectable:!0,selectHelper:!0,select:function(a,b,c){var d=prompt("Event Title:");d&&h.fullCalendar("renderEvent",{title:d,start:a,end:b,allDay:c},!0),h.fullCalendar("unselect")},editable:!0,events:[{title:"All Day Event",start:new Date(g,f,1),className:"label label-success"},{title:"Long Event",start:new Date(g,f,e-5),end:new Date(g,f,e-2),className:"label label-info"},{id:999,title:"Repeating Event",start:new Date(g,f,e-3,16,0),allDay:!1,className:"label label-warning"},{id:999,title:"Repeating Event",start:new Date(g,f,e+4,16,0),allDay:!1,className:"label label-inverse"},{title:"Meeting",start:new Date(g,f,e,10,30),allDay:!1,className:"label label-important"},{title:"Lunch",start:new Date(g,f,e,12,0),end:new Date(g,f,e,14,0),allDay:!1},{title:"Birthday Party",start:new Date(g,f,e+1,19,0),end:new Date(g,f,e+1,22,30),allDay:!1},{title:"Click for Google",start:new Date(g,f,28),end:new Date(g,f,29),url:"http://google.com/"}]}),i=[],j=[],k=0;14>k;k+=.5)i.push([k,Math.sin(k)]),j.push([k,Math.cos(k)]);var l=(a.plot(a("#trigo"),[{data:i,label:"sin(x)",points:{fillColor:"#4572A7",size:5},color:"#4572A7"},{data:j,label:"cos(x)",points:{fillColor:"#333",size:35},color:"#AA4643"}],{series:{lines:{show:!0},points:{show:!0}},grid:{hoverable:!0,clickable:!0},yaxis:{min:-1.2,max:1.2}}),null);a("#trigo").bind("plothover",function(c,d,e){if(a("#x").text(d.x.toFixed(2)),a("#y").text(d.y.toFixed(2)),e){if(l!==e.dataIndex){l=e.dataIndex,a("#tooltip").remove();var f=e.datapoint[0].toFixed(2),g=e.datapoint[1].toFixed(2);b(e.pageX,e.pageY,e.series.label+" of "+f+" = "+g)}}else a("#tooltip").remove(),l=null}),a(".sortableTable").tablesorter()},Metis}(jQuery),function(a){"use strict";return Metis.formGeneral=function(){a(".with-tooltip").tooltip({selector:".input-tooltip"}),a("#autosize").length&&a("#autosize").autosize(),a("#limiter").inputlimiter({limit:140,remText:"You only have %n character%s remaining...",limitText:"You're allowed to input %n character%s into this field."}),a("#tags").tagsInput(),a(".chzn-select").chosen(),a(".chzn-select-deselect").chosen({allow_single_deselect:!0}),a(".uniform").uniform(),a("#validVal").validVal(),a("#cp1").colorpicker({format:"hex"}),a("#cp2").colorpicker(),a("#cp3").colorpicker(),a("#cp4").colorpicker().on("changeColor",function(b){a("#colorPickerBlock").css("background-color",b.color.toHex())}),a("#dp1").datepicker({format:"mm-dd-yyyy"}),a("#dp2").datepicker(),a("#dp3").datepicker(),a("#dp3").datepicker(),a("#dpYears").datepicker(),a("#dpMonths").datepicker();var b=new Date(2014,1,20),c=new Date(2014,1,25);a("#dp4").datepicker().on("changeDate",function(d){d.date.valueOf()>c.valueOf()?a("#alert").show().find("strong").text("The start date can not be greater then the end date"):(a("#alert").hide(),b=new Date(d.date),a("#startDate").text(a("#dp4").data("date"))),a("#dp4").datepicker("hide")}),a("#dp5").datepicker().on("changeDate",function(d){d.date.valueOf()<b.valueOf()?a("#alert").show().find("strong").text("The end date can not be less then the start date"):(a("#alert").hide(),c=new Date(d.date),a("#endDate").text(a("#dp5").data("date"))),a("#dp5").datepicker("hide")}),a("#reservation").daterangepicker(),a("#reportrange").daterangepicker({ranges:{Today:[moment(),moment()],Yesterday:[moment().subtract("days",1),moment().subtract("days",1)],"Last 7 Days":[moment().subtract("days",6),moment()],"Last 30 Days":[moment().subtract("days",29),moment()],"This Month":[moment().startOf("month"),moment().endOf("month")],"Last Month":[moment().subtract("month",1).startOf("month"),moment().subtract("month",1).endOf("month")]}},function(b,c){a("#reportrange span").html(b.format("MMMM D, YYYY")+" - "+c.format("MMMM D, YYYY"))}),a("#datetimepicker4").datetimepicker({pickDate:!1}),a.each(a(".make-switch"),function(){a(this).bootstrapSwitch({onText:a(this).data("onText"),offText:a(this).data("offText"),onColor:a(this).data("onColor"),offColor:a(this).data("offColor"),size:a(this).data("size"),labelText:a(this).data("labelText")})})},Metis}(jQuery),function(a){"use strict";return Metis.formValidation=function(){a("#popup-validation").validationEngine(),a("#inline-validate").validate({rules:{required:"required",email:{required:!0,email:!0},date:{required:!0,date:!0},url:{required:!0,url:!0},password:{required:!0,minlength:5},confirm_password:{required:!0,minlength:5,equalTo:"#password"},agree:"required",minsize:{required:!0,minlength:3},maxsize:{required:!0,maxlength:6},minNum:{required:!0,min:3},maxNum:{required:!0,max:16}},errorClass:"help-block col-lg-6",errorElement:"span",highlight:function(b){a(b).parents(".form-group").removeClass("has-success").addClass("has-error")},unhighlight:function(b){a(b).parents(".form-group").removeClass("has-error").addClass("has-success")}}),a("#block-validate").validate({rules:{required2:"required",email2:{required:!0,email:!0},date2:{required:!0,date:!0},url2:{required:!0,url:!0},password2:{required:!0,minlength:5},confirm_password2:{required:!0,minlength:5,equalTo:"#password2"},agree2:"required",digits:{required:!0,digits:!0},range:{required:!0,range:[5,16]}},errorClass:"help-block",errorElement:"span",highlight:function(b){a(b).parents(".form-group").removeClass("has-success").addClass("has-error")},unhighlight:function(b){a(b).parents(".form-group").removeClass("has-error").addClass("has-success")}})},Metis}(jQuery),function(a,b){"use strict";return b.formWizard=function(){a("#fileUpload").uniform(),a("#uploader").pluploadQueue({runtimes:"html5,html4",url:"form-wysiwyg.html",max_file_size:"128kb",unique_names:!0,filters:[{title:"Image files",extensions:"jpg,gif,png"}]}),a("#wizardForm").formwizard({formPluginEnabled:!0,validationEnabled:!0,focusFirstInput:!0,formOptions:{beforeSubmit:function(b){return a.gritter.add({title:"data sent to the server",text:a.param(b),sticky:!1}),!1},dataType:"json",resetForm:!0},validationOptions:{rules:{server_host:"required",server_name:"required",server_user:"required",server_password:"required",table_prefix:"required",table_collation:"required",username:{required:!0,minlength:3},usermail:{required:!0,email:!0},pass:{required:!0,minlength:6},pass2:{required:!0,minlength:6,equalTo:"#pass"}},errorClass:"help-block",errorElement:"span",highlight:function(b){a(b).parents(".form-group").removeClass("has-success").addClass("has-error")},unhighlight:function(b){a(b).parents(".form-group").removeClass("has-error").addClass("has-success")}}})},b}(jQuery,Metis||{}),function(a){"use strict";return Metis.formWysiwyg=function(){a("#wysihtml5").wysihtml5();var b=Markdown.getSanitizingConverter(),c=new Markdown.Editor(b);c.run();{var d={basePath:"//cdnjs.cloudflare.com/ajax/libs/epiceditor/0.2.2"};new EpicEditor(d).load()}},Metis}(jQuery),function(a){"use strict";return Metis.MetisCalendar=function(){var b=new Date,c=(b.getDate(),b.getMonth(),b.getFullYear(),{});c=a(window).width()<=767?{left:"title",center:"month,agendaWeek,agendaDay",right:"prev,today,next"}:{left:"",center:"title",right:"prev,today,month,agendaWeek,agendaDay,next"};var d=function(b){var c={title:a.trim(b.text()),className:a.trim(b.children("span").attr("class"))};b.data("eventObject",c),b.draggable({zIndex:999,revert:!0,revertDuration:0})},e=function(b,c){b=0===b.length?"Untitled Event":b,c=0===c.length?"label label-default":c;var e=a('<li class="external-event"><span class="'+c+'">'+b+"</span></li>");jQuery("#external-events").append(e),d(e)};a("#external-events li.external-event").each(function(){d(a(this))}),a("#add-event").click(function(){var b=a("#title").val(),c=a("input:radio[name=priority]:checked").val();e(b,c)}),a("#calendar").fullCalendar({header:c,editable:!0,droppable:!0,drop:function(b){var c=a(this).data("eventObject"),d=a.extend({},c);d.start=b,a("#calendar").fullCalendar("renderEvent",d,!0),a("#drop-remove").is(":checked")&&a(this).remove()},windowResize:function(){a("#calendar").fullCalendar("render")}})},Metis}(jQuery),function(a){"use strict";return Metis.MetisFile=function(){a("#elfinder").elfinder({url:"assets/elfinder-2.0-rc1/php/connector.php"}).elfinder("instance")},Metis}(jQuery),function(a){"use strict";return Metis.MetisMaps=function(){var b,c,d,e,f,g,h;b=new GMaps({el:"#gmaps-basic",lat:-12.043333,lng:-77.028333,zoomControl:!0,zoomControlOpt:{style:"SMALL",position:"TOP_LEFT"},panControl:!1,streetViewControl:!1,mapTypeControl:!1,overviewMapControl:!1}),c=new GMaps({el:"#gmaps-marker",lat:-12.043333,lng:-77.028333}),c.addMarker({lat:-12.043333,lng:-77.03,title:"Lima",details:{database_id:42,author:"HPNeo"},click:function(a){console.log&&console.log(a),alert("You clicked in this marker")},mouseover:function(a){console.log&&console.log(a)}}),c.addMarker({lat:-12.042,lng:-77.028333,title:"Marker with InfoWindow",infoWindow:{content:"<p>HTML Content</p>"}}),d=new GMaps({el:"#gmaps-geolocation",lat:-12.043333,lng:-77.028333}),GMaps.geolocate({success:function(a){d.setCenter(a.coords.latitude,a.coords.longitude)},error:function(a){alert("Geolocation failed: "+a.message)},not_supported:function(){alert("Your browser does not support geolocation")},always:function(){}}),e=new GMaps({el:"#gmaps-polylines",lat:-12.043333,lng:-77.028333,click:function(a){console.log(a)}}),g=[[-12.044012922866312,-77.02470665341184],[-12.05449279282314,-77.03024273281858],[-12.055122327623378,-77.03039293652341],[-12.075917129727586,-77.02764635449216],[-12.07635776902266,-77.02792530422971],[-12.076819390363665,-77.02893381481931],[-12.088527520066453,-77.0241058385925],[-12.090814532191756,-77.02271108990476]],e.drawPolyline({path:g,strokeColor:"#131540",strokeOpacity:.6,strokeWeight:6}),f=new GMaps({el:"#gmaps-route",lat:-12.043333,lng:-77.028333}),f.drawRoute({origin:[-12.044012922866312,-77.02470665341184],destination:[-12.090814532191756,-77.02271108990476],travelMode:"driving",strokeColor:"#131540",strokeOpacity:.6,strokeWeight:6}),h=new GMaps({el:"#gmaps-geocoding",lat:-12.043333,lng:-77.028333}),a("#geocoding_form").submit(function(b){b.preventDefault(),GMaps.geocode({address:a("#address").val().trim(),callback:function(a,b){if("OK"===b){var c=a[0].geometry.location;h.setCenter(c.lat(),c.lng()),h.addMarker({lat:c.lat(),lng:c.lng()})}}})})},Metis}(jQuery),function(a,b){if(a().sortable){var c=a(".inner [class*=col-]");return b.metisSortable=function(){c.sortable({placeholder:"ui-state-highlight"}).disableSelection()},b}}(jQuery,Metis||{}),function(a){"use strict";return Metis.MetisTable=function(){a(".sortableTable").tablesorter(),a("#dataTable").dataTable({})},Metis}(jQuery),function(a,b){"use strict";var c=function(a,b){a.removeClass("primary success danger warning info default").addClass(b)};return b.MetisPricing=function(){var d=a("ul.dark li.active"),e=a("ul#light li.active");a("#dark-toggle label").on(b.buttonPressedEvent,function(){var b=a(this);c(d,b.find("input").val())}),a("#light-toggle label").on(b.buttonPressedEvent,function(){var b=a(this);c(e,b.find("input").val())})},b}(jQuery,Metis||{}),function(a,b){return b.MetisProgress=function(){var b=a(".progress .progress-bar");a.each(b,function(){var b=a(this);b.animate({width:a(this).attr("aria-valuenow")+"%"}).popover({placement:"bottom",title:"Source",content:this.outerHTML})})},b}(jQuery,Metis);
//# sourceMappingURL=app.js.map
;
/**
* Metis - Bootstrap-Admin-Template v2.3.2
* Author : onokumus 
* Copyright 2015
* Licensed under MIT (https://github.com/onokumus/Bootstrap-Admin-Template/blob/master/LICENSE.md)
*/


function LocalStorageManager(){this.bgColor="bgColor",this.fgcolor="fgcolor",this.bgImage="bgImage";var a=this.localStorageSupported();this.storage=a?window.localStorage:window.fakeStorage}function InputTypeManager(){var a=this.colorTypeSupported();this.ci=a}window.fakeStorage={_data:{},setItem:function(a,b){return this._data[a]=String(b)},getItem:function(a){return this._data.hasOwnProperty(a)?this._data[a]:void 0},removeItem:function(a){return delete this._data[a]},clear:function(){return this._data={}}},LocalStorageManager.prototype.localStorageSupported=function(){var a="test",b=window.localStorage;try{return b.setItem(a,"1"),b.removeItem(a),!0}catch(c){return!1}},LocalStorageManager.prototype.getBgColor=function(){return this.storage.getItem(this.bgColor)||"#333"},LocalStorageManager.prototype.setBgColor=function(a){this.storage.setItem(this.bgColor,a)},LocalStorageManager.prototype.getFgColor=function(){return this.storage.getItem(this.fgColor)||"#fff"},LocalStorageManager.prototype.setFgColor=function(a){this.storage.setItem(this.fgColor,a)},LocalStorageManager.prototype.getBgImage=function(){return this.storage.getItem(this.bgImage)||"arches"},LocalStorageManager.prototype.setBgImage=function(a){this.storage.setItem(this.bgImage,a)},LocalStorageManager.prototype.clearItems=function(){this.storage.removeItem(this.bgColor),this.storage.removeItem(this.fgColor),this.storage.removeItem(this.bgImage)},InputTypeManager.prototype.colorTypeSupported=function(){var a=document.createElement("input");return a.setAttribute("type","color"),"text"!==a.type},StyleSwitcher=function(){this.inputManager=new InputTypeManager,this.storageManager=new LocalStorageManager,this.init()},StyleSwitcher.prototype.init=function(){this.showChange(),this.build()},StyleSwitcher.prototype.showChange=function(){this.bgColor=this.storageManager.getBgColor(),this.fgColor=this.storageManager.getFgColor(),this.bgImage=this.storageManager.getBgImage(),this.postLess(this.bgColor,this.fgColor,this.bgImage)},StyleSwitcher.prototype.build=function(){var a=this;a.storageManager=new LocalStorageManager;var b=window.location.pathname.toString(),c="";"rtl"===$("body").css("direction")&&$("body").addClass("rtl"),b.indexOf("/rtl/")>-1&&(c+="../"),$("body").css({"background-image":"url("+c+"assets/img/pattern/"+a.storageManager.getBgImage()+".png)","background-repeat":" repeat"});var d='<div id="getCSSModal" class="modal fade"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button><h4 class="modal-title">Theme CSS</h4><code>Copy textarea content and paste into theme.css</code></div> <div class="modal-body"><textarea class="form-control" name="cssbeautify" id="cssbeautify" readonly></textarea></div> <div class="modal-footer"><button aria-hidden="true" data-dismiss="modal" class="btn btn-danger">Close</button></div> </div></div> </div>';$("body").append(d);var e=$("<div />").attr("id","style-switcher").addClass("style-switcher hidden-xs"),f=$("<i />").addClass("fa fa-cogs fa-2x"),g=$("<a />").attr({href:"#",id:"switcher-link"}).on(Metis.buttonPressedEvent,function(a){a.preventDefault(),e.toggleClass("open"),$(this).find("i").toggleClass("fa-spin")}).append(f),h=$("<h5 />").html("Style Switcher").append(g),i=$("<ul />").addClass("options").attr("data-type","colors"),j=[{Hex:"#0088CC",colorName:"Blue"},{Hex:"#4EB25C",colorName:"Green"},{Hex:"#4A5B7D",colorName:"Navy"},{Hex:"#E05048",colorName:"Red"},{Hex:"#B8A279",colorName:"Beige"},{Hex:"#c71c77",colorName:"Pink"},{Hex:"#734BA9",colorName:"Purple"},{Hex:"#2BAAB1",colorName:"Cyan"}];$.each(j,function(a){var b=$("<li/>").append($("<a/>").css("background-color",j[a].Hex).attr({"data-color-hex":j[a].Hex,"data-color-name":j[a].colorName,href:"#",title:j[a].colorName}).tooltip({placement:"bottom"}));i.append(b)});var k,l=new InputTypeManager;if(l.ci)k=$("<input/>").addClass("color-picker-icon").attr({id:"colorSelector",type:"color"}).val(a.storageManager.getBgColor()),k.on("change",function(){a.storageManager.setBgColor($(this).val()),a.showChange()});else{var m=$("<link/>").attr({rel:"stylesheet",href:c+"assets/lib/colorpicker/css/colorpicker.css"}),n=$("<link/>").attr({rel:"stylesheet",href:c+"assets/css/colorpicker_hack.css"});k=$("<div/>").addClass("color-picker").attr({id:"colorSelector","data-color":a.storageManager.getBgColor(),"data-color-format":"hex"});var o=c+"assets/lib/colorpicker/js/bootstrap-colorpicker.js";$.getScript(o,function(){$("head").append(m,n),k.append($("<a/>").css({"background-color":a.storageManager.getBgColor()}).attr({href:"#",id:"colorSelectorA"})),k.colorpicker().on("changeColor",function(b){k.find("a").css("background-color",b.color.toHex()),a.storageManager.setBgColor(b.color.toHex()),a.showChange()})})}var p=$("<li/>").append(k);i.find("a").on(Metis.buttonPressedEvent,function(b){b.preventDefault(),a.storageManager.setBgColor($(this).data("colorHex")),a.showChange(),k.attr("data-color",$(this).data("colorHex")),k.val($(this).data("colorHex")),k.find("a").css("background-color",$(this).data("colorHex"))}),i.append(p);var q=$("<div />").addClass("style-switcher-wrap").append($("<h6 />").html("Background Colors"),i,$("<hr/>")),r=$("<input/>").attr({type:"radio",name:"fgcolor"}).val("#ffffff").on("change",function(){a.storageManager.setFgColor("#ffffff"),a.showChange()}),s=$("<label/>").addClass("btn btn-xs btn-primary").html("White").append(r),t=$("<input/>").attr({type:"radio",name:"fgcolor"}).val("#333333").on("change",function(){a.storageManager.setFgColor("#333333"),a.showChange()}),u=$("<label/>").addClass("btn btn-xs btn-danger").html("Black").append(t),v=$("<div/>").addClass("btn-group").attr("data-toggle","buttons").append(s,u);q.append($("<div/>").addClass("options-link").append($("<h6/>").html("Font Colors"),v));var w=$("<ul />").addClass("options").attr("data-type","pattern"),x=[{image:"brillant",title:"Brillant"},{image:"always_grey",title:"Always Grey"},{image:"retina_wood",title:"Retina Wood"},{image:"low_contrast_linen",title:"Low Constrat Linen"},{image:"egg_shell",title:"Egg Shel"},{image:"cartographer",title:"Cartographer"},{image:"batthern",title:"Batthern"},{image:"noisy_grid",title:"Noisy Grid"},{image:"diamond_upholstery",title:"Diamond Upholstery"},{image:"greyfloral",title:"Gray Floral"},{image:"white_tiles",title:"White Tiles"},{image:"gplaypattern",title:"GPlay"},{image:"arches",title:"Arches"},{image:"purty_wood",title:"Purty Wood"},{image:"diagonal_striped_brick",title:"Diagonal Striped Brick"},{image:"large_leather",title:"Large Leather"},{image:"bo_play_pattern",title:"BO Play"},{image:"irongrip",title:"Iron Grip"},{image:"wood_1",title:"Dark Wood"},{image:"pool_table",title:"Pool Table"},{image:"crissXcross",title:"crissXcross"},{image:"rip_jobs",title:"R.I.P Steve Jobs"},{image:"random_grey_variations",title:"Random Grey Variations"},{image:"carbon_fibre",title:"Carbon Fibre"}];$.each(x,function(a){var b=$("<li/>").append($("<a/>").css({background:"url("+c+"assets/img/pattern/"+x[a].image+".png) repeat"}).attr({href:"#",title:x[a].title,"data-pattern-image":x[a].image}).tooltip({placement:"bottom"}));w.append(b)}),w.find("a").on(Metis.buttonPressedEvent,function(b){b.preventDefault(),$("body").css({"background-image":"url("+c+"assets/img/pattern/"+$(this).data("patternImage")+".png)","background-repeat":" repeat"}),a.patternImage=$(this).data("patternImage"),a.storageManager.setBgImage(a.patternImage),a.showChange()}),q.append($("<div/>").addClass("pattern").append($("<h6/>").html("Background Pattern"),w));var y=$("<a/>").html("Reset").attr("href","#").on(Metis.buttonPressedEvent,function(b){a.reset(),b.preventDefault()}),z=$("<a/>").html("Get CSS").attr("href","#").on(Metis.buttonPressedEvent,function(b){b.preventDefault(),a.getCss()});q.append($("<div/>").addClass("options-link").append($("<hr/>"),y,z)),e.append(h,q),$("body").append(e)},StyleSwitcher.prototype.postLess=function(a,b,c){this.bgc=a,this.fgc=b,this.bgi=c,less.modifyVars({"@bgColor":this.bgc,"@fgColor":this.fgc,"@bgImage":this.bgi})},StyleSwitcher.prototype.getCss=function(){var a=this,b="",c=$("body").hasClass("fixed"),d=$("#cssbeautify");c?(b='body { background-image: url("../img/pattern/'+a.patternImage+'.png"); }',$("#boxedBodyAlert").removeClass("hide")):$("#boxedBodyAlert").addClass("hide"),d.text(""),b+=$('style[id^="less:"]').text(),d.text(b),$("#getCSSModal").modal("show")},StyleSwitcher.prototype.reset=function(){this.storageManager.clearItems(),this.showChange()},window.StyleSwitcher=new StyleSwitcher;
//# sourceMappingURL=style-switcher.js.map
;
(function() {


}).call(this);
/**
* Metis - Bootstrap-Admin-Template v2.3.2
* Author : onokumus 
* Copyright 2015
* Licensed under MIT (https://github.com/onokumus/Bootstrap-Admin-Template/blob/master/LICENSE.md)
*/


function updateBar(a){fillSecondBar(a[6]),fillMinuteBar(a[5]),fillHourBar(a[4]),fillDayBar(a[3]),fillTotalbar(a[6]+60*a[5]+60*a[4]*60+60*a[3]*60*24)}function fillSecondBar(a){$("#second-number").html(a),$("#second-bar").css("width",100*a/60+"%")}function fillMinuteBar(a){$("#minute-number").html(a),$("#minute-bar").css("width",100*a/60+"%")}function fillHourBar(a){$("#hour-number").html(a),$("#hour-bar").css("width",100*a/24+"%")}function fillDayBar(a){$("#day-number").html(a),$("#day-bar").css("width",100*a/365+"%")}function fillTotalbar(a){defaultPercent=100-100*a/difToSecond,currentPercent=defaultPercent>=10?defaultPercent.toString().substr(0,5):defaultPercent.toString().substr(0,4),$("#total-bar").css("width",defaultPercent+"%").html(currentPercent+"%")}var startDate=new Date("01/01/2014"),endDate=new Date("04/06/2015"),dif=endDate.getTime()-startDate.getTime(),difToSecond=dif/1e3,defaultPercent=0;$(function(){$("#counter").countdown({until:endDate,layout:"<div></div>",onTick:updateBar}),$("a[rel=tooltip]").tooltip(),$("div[rel=tooltip]").tooltip()});var map;map=new GMaps({el:"#map_canvas",lat:-12.043333,lng:-77.028333}),$(function(){$("#emailForm").validate({rules:{email1:{required:!0,email:!0}},errorClass:"help-block",errorElement:"span",highlight:function(a){$(a).parents(".form-group").removeClass("has-success").addClass("has-error")},unhighlight:function(a){$(a).parents(".form-group").removeClass("has-error").addClass("has-success")}}),$("#messageForm").validate({rules:{name:{required:!0},email:{required:!0,email:!0},subject:{required:!0},message:{required:!0}},errorClass:"help-block",errorElement:"span",highlight:function(a){$(a).parents(".form-group").removeClass("has-success").addClass("has-error")},unhighlight:function(a){$(a).parents(".form-group").removeClass("has-error").addClass("has-success")}})});
//# sourceMappingURL=countdown.js.map
;
// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or vendor/assets/javascripts of plugins, if any, can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file.
//
// Read Sprockets README (https://github.com/sstephenson/sprockets#sprockets-directives) for details
// about supported directives.
//
// Não existe requery do jquery por que ele está na pasta assets para que seja possivel utilizar uma versão mais nova sem remover o rails-jquery
// mas o import do jquery está no application html
//




//= countdown.min


;
