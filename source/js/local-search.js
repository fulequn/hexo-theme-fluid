/* global CONFIG */

(function() {
  // Modified from [hexo-generator-search](https://github.com/wzpan/hexo-generator-search)
  'use strict';

  var modal = jQuery('#modalSearch');
  var $input = jQuery('#local-search-input');
  var $result = jQuery('#local-search-result');
  var dataList = null;
  var loading = false;
  var searchTimer = null;

  if ($input.length === 0 || $result.length === 0) {
    throw Error('Local search element not found');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function(character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^{}$()|[\]\\]/g, '\\$&');
  }

  function renderResults() {
    if (!dataList) {
      return;
    }

    var query = $input.val().trim();
    var resultHTML = '';
    var keywords = query.toLowerCase().split(/[\s-]+/).filter(Boolean);
    if (keywords.length === 0) {
      $result.html('');
      $input.removeClass('invalid').removeClass('valid');
      return;
    }
    var highlightPattern = new RegExp(keywords.map(escapeRegExp).join('|'), 'gi');

    dataList.forEach(function(data) {
      var isMatch = true;
      var firstOccur = -1;
      if (CONFIG.include_content_in_search && data.searchContent === '') {
        return;
      }

      keywords.forEach(function(keyword, index) {
        var indexTitle = data.searchTitle.indexOf(keyword);
        var indexContent = data.searchContent.indexOf(keyword);
        if (indexTitle < 0 && indexContent < 0) {
          isMatch = false;
        } else if (index === 0) {
          firstOccur = Math.max(indexContent, 0);
        }
      });
      if (!isMatch) {
        return;
      }

      resultHTML += '<a href="' + escapeHtml(data.url) +
        '" class="list-group-item list-group-item-action font-weight-bolder search-list-title">' +
        escapeHtml(data.title) + '</a>';

      if (firstOccur >= 0) {
        var start = Math.max(firstOccur - 20, 0);
        var end = start === 0 ? 100 : firstOccur + 80;
        var snippet = data.content.substring(start, Math.min(end, data.content.length));
        snippet = snippet.replace(highlightPattern, function(match) {
          return '<span class="search-word">' + match + '</span>';
        });
        resultHTML += '<p class="search-list-content">' + snippet + '...</p>';
      }
    });

    if (resultHTML.indexOf('list-group-item') === -1) {
      $result.html('');
      $input.addClass('invalid').removeClass('valid');
      return;
    }
    $input.addClass('valid').removeClass('invalid');
    $result.html(resultHTML);
  }

  function loadIndex() {
    if (dataList) {
      return;
    }
    $result.html('<div class="m-auto text-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div><br/>Loading...</div>');
    if (loading) {
      return;
    }
    loading = true;
    jQuery.ajax({
      url: CONFIG.search_path || '/local-search.xml',
      dataType: 'xml',
      success: function(xmlResponse) {
        dataList = jQuery('entry', xmlResponse).map(function() {
          var title = jQuery('title', this).text().trim() || 'Untitled';
          var content = jQuery('content', this).text().trim().replace(/<[^>]+>/g, '');
          return {
            title: title,
            searchTitle: title.toLowerCase(),
            content: content,
            searchContent: content.toLowerCase(),
            url: jQuery('url', this).text()
          };
        }).get();
        loading = false;
        clearTimeout(searchTimer);
        searchTimer = null;
        renderResults();
      },
      error: function() {
        loading = false;
        $result.html('<div class="m-auto text-center">Search index could not be loaded.</div>');
      }
    });
  }

  $input.on('input', function() {
    clearTimeout(searchTimer);
    if ($input.val().trim() === '') {
      renderResults();
    } else {
      searchTimer = setTimeout(renderResults, 120);
    }
  });

  modal.on('show.bs.modal', function() {
    loadIndex();
  });
  modal.on('shown.bs.modal', function() {
    $input.focus();
  });
  modal.on('hidden.bs.modal', function() {
    clearTimeout(searchTimer);
    $input.val('').removeClass('invalid').removeClass('valid');
    $result.html('');
  });
})();
