/* global Fluid, CONFIG */

HTMLElement.prototype.wrap = function(wrapper) {
  this.parentNode.insertBefore(wrapper, this);
  this.parentNode.removeChild(this);
  wrapper.appendChild(this);
};

Fluid.plugins = {

  typing: function(text) {
    if (!('Typed' in window)) { return; }

    var typed = new window.Typed('#subtitle', {
      strings: [
        '  ',
        text
      ],
      cursorChar: CONFIG.typing.cursorChar,
      typeSpeed : CONFIG.typing.typeSpeed,
      loop      : CONFIG.typing.loop
    });
    typed.stop();
    var subtitle = document.getElementById('subtitle');
    if (subtitle) {
      subtitle.innerText = '';
    }
    jQuery(document).ready(function() {
      typed.start();
    });
  },

  fancyBox: function(selector) {
    if (!CONFIG.image_zoom.enable || !('fancybox' in jQuery)) { return; }

    jQuery(selector || '.markdown-body :not(a) > img, .markdown-body > img').each(function() {
      var $image = jQuery(this);
      var imageUrl = $image.attr('data-src') || $image.attr('src') || '';
      if (CONFIG.image_zoom.img_url_replace) {
        var rep = CONFIG.image_zoom.img_url_replace;
        var r1 = rep[0] || '';
        var r2 = rep[1] || '';
        if (r1) {
          if (/^re:/.test(r1)) {
            r1 = r1.replace(/^re:/, '');
            var reg = new RegExp(r1, 'gi');
            imageUrl = imageUrl.replace(reg, r2);
          } else {
            imageUrl = imageUrl.replace(r1, r2);
          }
        }
      }
      var $imageWrap = $image.wrap(`
        <a class="fancybox fancybox.image" href="${imageUrl}"
          itemscope itemtype="http://schema.org/ImageObject" itemprop="url"></a>`
      ).parent('a');
      if ($imageWrap.length !== 0) {
        if ($image.is('.group-image-container img')) {
          $imageWrap.attr('data-fancybox', 'group').attr('rel', 'group');
        } else {
          $imageWrap.attr('data-fancybox', 'default').attr('rel', 'default');
        }

        var imageTitle = $image.attr('title') || $image.attr('alt');
        if (imageTitle) {
          $imageWrap.attr('title', imageTitle).attr('data-caption', imageTitle);
        }
      }
    });

    jQuery.fancybox.defaults.hash = false;
    jQuery('.fancybox').fancybox({
      loop   : true,
      afterLoad: function(instance, current) {
        if (current.type !== 'image' || !current.$thumb || !current.$thumb.length) { return; }
        var thumbnail = current.$thumb[0].getBoundingClientRect();
        if (!thumbnail.width || !thumbnail.height ||
            (current.width > 0 && current.height > 0 && thumbnail.width <= current.width)) { return; }
        var width = current.width > 0 && current.height > 0 ? current.width : thumbnail.width;
        var height = current.width > 0 && current.height > 0 ? current.height : thumbnail.height;
        var targetWidth = /\.svg(?:[?#]|$)/i.test(current.src)
          ? Math.max(1600, thumbnail.width * 2)
          : thumbnail.width;
        current.height = Math.round(height * targetWidth / width);
        current.width = targetWidth;
      },
      helpers: {
        overlay: {
          locked: false
        }
      }
    });
  },

  imageCaption: function(selector) {
    if (!CONFIG.image_caption.enable) { return; }

    jQuery(selector || `.markdown-body > p > img, .markdown-body > figure > img,
      .markdown-body > p > a.fancybox, .markdown-body > figure > a.fancybox`).each(function() {
      var $target = jQuery(this);
      var $figcaption = $target.next('figcaption');
      if ($figcaption.length !== 0) {
        $figcaption.addClass('image-caption');
      } else {
        var imageTitle = $target.attr('title') || $target.attr('alt');
        if (imageTitle) {
          $target.after(`<figcaption aria-hidden="true" class="image-caption">${imageTitle}</figcaption>`);
        }
      }
    });
  },

  codeWidget() {
    var self = this;
    var enableLang = CONFIG.code_language.enable && CONFIG.code_language.default;
    var nativeClipboard = navigator.clipboard && typeof navigator.clipboard.writeText === 'function';
    var clipboardJsAvailable = typeof window.ClipboardJS === 'function';
    var enableCopy = CONFIG.copy_btn && (clipboardJsAvailable || nativeClipboard);
    if (!enableLang && !enableCopy) {
      return;
    }

    function getBgClass(ele) {
      return Fluid.utils.getBackgroundLightness(ele) >= 0 ? 'code-widget-light' : 'code-widget-dark';
    }

    function showCopied(button) {
      button.textContent = '已复制';
      setTimeout(function() {
        button.textContent = '复制';
      }, 2000);
    }

    function showCopyFailed(button) {
      button.textContent = '复制失败';
      setTimeout(function() { button.textContent = '复制'; }, 2000);
    }

    function bindCopyButton($widget, $pre) {
      $widget.children('.copy-btn').on('click', function() {
        var code = $pre.children('code')[0];
        if (!code) { return; }
        var button = this;
        navigator.clipboard.writeText(code.textContent).then(function() {
          showCopied(button);
        }).catch(function() {
          showCopyFailed(button);
        });
      });
    }

    jQuery('.markdown-body pre').each(function() {
      var $pre = jQuery(this);
      if ($pre.find('code.mermaid').length > 0) {
        return;
      }
      if ($pre.find('span.line').length > 0) {
        return;
      }
      if ($pre.children('.code-widget').length > 0) {
        return;
      }

      var lang = '';

      if (enableLang) {
        lang = CONFIG.code_language.default;
        if ($pre[0].children.length > 0 && $pre[0].children[0].classList.length >= 2 && $pre.children().hasClass('hljs')) {
          lang = $pre[0].children[0].classList[1];
        } else if ($pre[0].getAttribute('data-language')) {
          lang = $pre[0].getAttribute('data-language');
        } else if ($pre.parent().hasClass('sourceCode') && $pre[0].children.length > 0 && $pre[0].children[0].classList.length >= 2) {
          lang = $pre[0].children[0].classList[1];
          $pre.parent().addClass('code-wrapper');
        } else if ($pre.parent().hasClass('markdown-body') && $pre[0].classList.length === 0) {
          $pre.wrap('<div class="code-wrapper"></div>');
        }
        lang = lang.toUpperCase().replace('NONE', CONFIG.code_language.default);
      }
      var $widget = jQuery('<div class="code-widget"></div>').addClass(getBgClass($pre[0]));
      if (enableLang) {
        jQuery('<span class="code-language"></span>').text(lang).appendTo($widget);
      }
      if (enableCopy) {
        jQuery('<button type="button" class="copy-btn" aria-label="复制代码">复制</button>').appendTo($widget);
      }
      $pre.append($widget);

      if (enableCopy && !clipboardJsAvailable) {
        bindCopyButton($widget, $pre);
      } else if (enableCopy && self.codeClipboard) {
        // ClipboardJS 只绑定实例创建时已存在的按钮；解密等场景二次刷新新增的按钮
        // 不会被它接管，这里补上同样的复制逻辑，避免出现点不动的“复制”
        // ClipboardJS only binds buttons present at construction; bind later ones here
        bindCopyButton($widget, $pre);
      }
    });

    if (enableCopy && clipboardJsAvailable && !this.codeClipboard) {
      this.codeClipboard = new ClipboardJS('.code-widget .copy-btn', {
        target: function(trigger) {
          return trigger.parentNode.parentNode.querySelector('code');
        }
      });
      this.codeClipboard.on('success', function(e) {
        e.clearSelection();
        showCopied(e.trigger);
      });
      this.codeClipboard.on('error', function(e) {
        var code = e.trigger.parentNode.parentNode.querySelector('code');
        if (!nativeClipboard || !code) {
          showCopyFailed(e.trigger);
          return;
        }
        navigator.clipboard.writeText(code.textContent).then(function() {
          showCopied(e.trigger);
        }).catch(function() {
          showCopyFailed(e.trigger);
        });
      });
    }
  }
};
