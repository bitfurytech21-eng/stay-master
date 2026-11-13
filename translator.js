(function () {
  'use strict';

  var languages = [
    ['en','English'],['ar','\u0627\u0644\u0639\u0631\u0628\u064a\u0629'],['zh-CN','\u7b80\u4f53\u4e2d\u6587'],['zh-TW','\u7e41\u9ad4\u4e2d\u6587'],
    ['fr','Fran\u00e7ais'],['de','Deutsch'],['es','Espa\u00f1ol'],['it','Italiano'],
    ['pt','Portugu\u00eas'],['ru','\u0420\u0443\u0441\u0441\u043a\u0438\u0439'],['ja','\u65e5\u672c\u8a9e'],['ko','\ud55c\uad6d\uc5b4'],
    ['hi','\u0939\u093f\u0928\u094d\u0926\u0940'],['nl','Nederlands'],['tr','T\u00fcrk\u00e7e'],['pl','Polski'],
    ['el','\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac'],['sv','Svenska'],['da','Dansk'],['no','Norsk'],
    ['fi','Suomi'],['he','\u05e2\u05d1\u05e8\u05d9\u05ea'],['id','Bahasa Indonesia'],['th','\u0e44\u0e17\u0e22'],
    ['vi','Ti\u1ebfng Vi\u1ec7t'],['uk','\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430'],['ur','\u0627\u0631\u062f\u0648'],['sw','Kiswahili']
  ];
  var originals = new WeakMap();
  var translated = new WeakMap();
  var activeLanguage = 'en';
  var busy = false;
  var observer;
  var excluded = 'SCRIPT,STYLE,NOSCRIPT,SVG,CODE,PRE,TEXTAREA,INPUT,SELECT,OPTION,IFRAME,[translate="no"],[contenteditable="true"]';

  function remember(node) {
    if (!originals.has(node)) originals.set(node, node.nodeValue);
    return originals.get(node);
  }

  function collectText(root) {
    var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim() || node.parentElement.closest(excluded)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  function collectAttributes() {
    var nodes = [];
    document.querySelectorAll('input[placeholder],textarea[placeholder],[aria-label],[title],img[alt]').forEach(function (el) {
      ['placeholder','aria-label','title','alt'].forEach(function (attr) {
        if (el.hasAttribute(attr) && el.getAttribute(attr).trim()) nodes.push({ el: el, attr: attr, value: el.getAttribute(attr) });
      });
    });
    return nodes;
  }

  async function translateBatch(values, target) {
    var endpoint = window.STAY_MASTER_API ? window.STAY_MASTER_API.url('/api/translate') : '/api/translate';
    var response = await fetch(endpoint, {
      method: 'POST',
      credentials: (window.STAY_MASTER_API && window.STAY_MASTER_API.crossOrigin) ? 'include' : 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: target, texts: values })
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || !payload.ok || !Array.isArray(payload.translations)) {
      throw new Error(payload.error || 'Translation service unavailable.');
    }
    return payload.translations;
  }

  async function translatePage(target) {
    if (busy) return;
    busy = true;
    if (observer) observer.disconnect();
    var status = document.getElementById('languageStatus');
    var select = document.getElementById('siteLanguage');
    if (status) status.textContent = target === 'en' ? 'Showing English' : 'Translating page\u2026';
    if (select) select.disabled = true;

    try {
      var textNodes = collectText(document.body);
      var attributes = collectAttributes();
      if (target === 'en') {
        textNodes.forEach(function (node) {
          if (originals.has(node)) node.nodeValue = remember(node);
        });
        attributes.forEach(function (item) {
          var key = item.attr;
          if (!item.el.__languageOriginals) item.el.__languageOriginals = {};
          if (item.el.__languageOriginals[key] !== undefined) item.el.setAttribute(key, item.el.__languageOriginals[key]);
        });
        activeLanguage = 'en';
        document.documentElement.lang = 'en';
        return;
      }

      var entries = [];
      textNodes.forEach(function (node) {
        var source = originals.has(node) ? remember(node) : node.nodeValue;
        if (!translated.has(node) || translated.get(node).language !== target) entries.push({ type: 'text', node: node, source: source });
      });
      attributes.forEach(function (item) {
        if (!item.el.__languageOriginals) item.el.__languageOriginals = {};
        if (item.el.__languageOriginals[item.attr] === undefined) item.el.__languageOriginals[item.attr] = item.value;
        entries.push({ type: 'attr', el: item.el, attr: item.attr, source: item.el.__languageOriginals[item.attr] });
      });

      for (var i = 0; i < entries.length; i += 40) {
        var batch = entries.slice(i, i + 40);
        var results = await translateBatch(batch.map(function (entry) { return entry.source; }), target);
        batch.forEach(function (entry, index) {
          if (entry.type === 'text') {
            entry.node.nodeValue = results[index];
            translated.set(entry.node, { language: target, value: results[index] });
          } else {
            entry.el.setAttribute(entry.attr, results[index]);
          }
        });
      }
      activeLanguage = target;
      document.documentElement.lang = target;
      if (status) status.textContent = 'Translated to ' + (languages.find(function (item) { return item[0] === target; }) || [target,target])[1];
    } catch (error) {
      if (status) status.textContent = error.message || 'Translation unavailable. Please try again.';
    } finally {
      busy = false;
      if (select) select.disabled = false;
      if (observer) observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function install() {
    if (!document.body || document.getElementById('siteLanguage')) return;
    var wrap = document.createElement('div');
    wrap.className = 'language-tool';
    wrap.innerHTML = '<label for="siteLanguage">Language</label><select id="siteLanguage" aria-label="Choose website language"></select><span id="languageStatus" role="status" aria-live="polite">Showing English</span>';
    document.body.appendChild(wrap);
    var select = wrap.querySelector('select');
    languages.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item[0];
      option.textContent = item[1];
      select.appendChild(option);
    });
    select.value = 'en';
    select.addEventListener('change', function () {
      try { localStorage.setItem('stayMasterLanguage', select.value); } catch (error) {}
      translatePage(select.value);
    });

    if (window.MutationObserver) {
      observer = new MutationObserver(function (records) {
        if (activeLanguage === 'en' || busy) return;
        var added = [];
        records.forEach(function (record) {
          record.addedNodes.forEach(function (node) {
            if (node.nodeType === 1 && !node.matches(excluded)) added.push(node);
            else if (node.nodeType === 3) added.push(node);
          });
        });
        if (!added.length) return;
        var nodes = [];
        added.forEach(function (node) {
          if (node.nodeType === 3) nodes.push(node);
          else nodes = nodes.concat(collectText(node));
        });
        nodes = nodes.filter(function (node) { return node.nodeValue && node.nodeValue.trim() && !translated.has(node); });
        if (!nodes.length) return;
        busy = true;
        observer.disconnect();
        (async function () {
          try {
            for (var i = 0; i < nodes.length; i += 40) {
              var batch = nodes.slice(i, i + 40);
              var results = await translateBatch(batch.map(function (node) { return remember(node); }), activeLanguage);
              batch.forEach(function (node, index) {
                node.nodeValue = results[index];
                translated.set(node, { language: activeLanguage, value: results[index] });
              });
            }
          } catch (error) {
            var status = document.getElementById('languageStatus');
            if (status) status.textContent = 'Some new content could not be translated.';
          } finally {
            busy = false;
            observer.observe(document.body, { childList: true, subtree: true });
          }
        })();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    var saved = '';
    try { saved = localStorage.getItem('stayMasterLanguage') || ''; } catch (error) {}
    var preferred = (navigator.languages && navigator.languages[0] || navigator.language || 'en').toLowerCase();
    var detected = languages.find(function (item) { return item[0].toLowerCase() === preferred; }) ||
      languages.find(function (item) { return item[0].toLowerCase() === preferred.split('-')[0]; });
    var match = languages.find(function (item) { return item[0] === saved; }) || detected;
    if (match) {
      select.value = match[0];
      if (match[0] !== 'en') translatePage(match[0]);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();