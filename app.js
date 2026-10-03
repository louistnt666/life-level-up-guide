(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const chapters = window.BOOK.chapters;
  const groups = window.BOOK.groups;
  let active = chapters[0], filter = 'all', query = '', observer;
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const chapterNumber = c => String(chapters.indexOf(c) + 1).padStart(2, '0');
  function highlight(text) {
    if (!query) return escape(text);
    const lower = text.toLocaleLowerCase(), needle = query.toLocaleLowerCase();
    let at = 0, result = '', next;
    while ((next = lower.indexOf(needle, at)) !== -1) {
      result += escape(text.slice(at, next)) + '<mark>' + escape(text.slice(next, next + query.length)) + '</mark>';
      at = next + query.length;
    }
    return result + escape(text.slice(at));
  }
  function matching() {
    return chapters.filter(c => (filter !== 'tools' || c.group === 7) && ($('group').value === 'all' || c.group === Number($('group').value)) && (!query || (c.title + '\n' + c.navTitle + '\n' + c.text).toLocaleLowerCase().includes(query.toLocaleLowerCase())));
  }
  function renderNav() {
    const found = matching();
    $('nav-count').textContent = found.length + ' / 62 个章节';
    $('reset').hidden = !query && filter === 'all' && $('group').value === 'all';
    $('chapters').innerHTML = groups.map((g, i) => {
      const rows = found.filter(c => c.group === i);
      return rows.length ? '<div class="nav-group"><h3>' + escape(g.title) + '</h3>' + rows.map(c => '<a class="chapter-link' + (c.id === active.id ? ' active' : '') + '" href="#' + c.id + '"' + (c.id === active.id ? ' aria-current="page"' : '') + '><span>' + chapterNumber(c) + '</span>' + escape(c.navTitle) + '</a>').join('') + '</div>' : '';
    }).join('') || '<p class="empty">没有匹配的章节。</p>';
  }
  function showResults() {
    const found = matching();
    $('reader-view').hidden = true;
    $('results-view').hidden = false;
    $('toc').innerHTML = '';
    $('results-title').textContent = query ? '搜索「' + query + '」' : filter === 'tools' ? '附录与实践工具' : groups[Number($('group').value)]?.title || '全书章节';
    $('results-summary').textContent = '找到 ' + found.length + ' 个章节' + (query ? ' · 搜索范围包含标题与完整正文' : ' · 选择一个章节开始阅读');
    $('breadcrumb').textContent = '全书检索';
    $('chapter-count').textContent = found.length + ' / 62';
    $('results').innerHTML = found.map(c => {
      const at = query ? c.text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) : 0;
      const start = Math.max(0, at - 50);
      const snippet = (start ? '…' : '') + c.text.slice(start, start + 170).replace(/\n/g, ' ') + '…';
      return '<a class="result-card" href="#' + c.id + '"><small>' + escape(groups[c.group].title) + ' · ' + chapterNumber(c) + '</small><h2>' + highlight(c.title) + '</h2><p>' + highlight(snippet) + '</p></a>';
    }).join('') || '<div class="empty">没有找到相关内容，试试更短的关键词，或清除章节筛选。<button id="empty-reset">查看全部章节</button></div>';
    $('empty-reset')?.addEventListener('click', reset);
    updateProgress();
  }
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    $('menu').setAttribute('aria-expanded', String(open));
    $('menu').setAttribute('aria-label', open ? '关闭章节目录' : '打开章节目录');
    $('backdrop').hidden = !open;
    if (open) $('search').focus();
  }
  function reset() {
    query = ''; filter = 'all'; $('search').value = ''; $('group').value = 'all';
    document.querySelectorAll('[data-filter]').forEach(b => {b.classList.toggle('active', b.dataset.filter === filter);b.setAttribute('aria-pressed', String(b.dataset.filter === filter));});
    renderChapter(active.id);
  }
  function renderChapter(id, anchor = '', scroll = true) {
    active = chapters.find(c => c.id === id) || chapters[0];
    $('reader-view').hidden = false; $('results-view').hidden = true;
    $('breadcrumb').textContent = groups[active.group].title;
    $('chapter-count').textContent = chapterNumber(active) + ' / 62';
    $('chapter-label').textContent = groups[active.group].title + ' / CHAPTER ' + chapterNumber(active);
    $('chapter-title').textContent = active.title;
    $('reading-time').textContent = '约 ' + active.minutes + ' 分钟';
    document.title = active.title + ' · 人生进阶指南';
    $('article').innerHTML = active.html;
    $('article').querySelectorAll('table').forEach(table => {const wrap = document.createElement('div');wrap.className = 'table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','可横向滚动的表格');table.before(wrap);wrap.append(table);});
    $('toc').innerHTML = active.headings.map(h => '<a class="' + (h.level === 3 ? 'subheading' : '') + '" href="#' + escape(h.id) + '">' + escape(h.title) + '</a>').join('');
    const index = chapters.indexOf(active);
    for (const [direction, item, label] of [['previous', chapters[index - 1], '← 上一章'], ['next', chapters[index + 1], '下一章 →']]) {
      const el = $(direction); el.style.visibility = item ? 'visible' : 'hidden';
      if (item) {el.href = '#' + item.id;el.innerHTML = '<small>' + label + '</small>' + escape(item.navTitle);}
      else {el.removeAttribute('href'); el.textContent = '';}
    }
    observer?.disconnect();
    observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length) document.querySelectorAll('#toc a').forEach(a => a.classList.toggle('active', decodeURIComponent(a.hash.slice(1)) === visible[0].target.id));
    }, {rootMargin: '-100px 0px -65% 0px'});
    $('article').querySelectorAll('h2,h3').forEach(h => observer.observe(h));
    renderNav(); setMenu(false);
    $('announce').textContent = '正在阅读：' + active.title;
    if (scroll) requestAnimationFrame(() => {
      const target = anchor && document.getElementById(anchor);
      if (target) target.scrollIntoView({behavior:'instant',block:'start'});
      else window.scrollTo({top:0,behavior:'instant'});
      updateProgress();
    });
  }
  function route() {
    let hash;
    try {hash = decodeURIComponent(location.hash.slice(1));} catch {hash = '';}
    if (hash === 'reading') {window.scrollTo({top:0}); return;}
    const id = hash.split('--')[0];
    if (id === active.id && !$('reader-view').hidden && hash.includes('--')) {
      document.getElementById(hash)?.scrollIntoView(); return;
    }
    renderChapter(id, hash.includes('--') ? hash : '');
  }
  function updateProgress() {
    const article = $('article');
    const total = article.offsetHeight - window.innerHeight + 140;
    const start = article.getBoundingClientRect().top + window.scrollY - 110;
    const percent = $('reader-view').hidden ? 0 : Math.max(0, Math.min(100, Math.round((window.scrollY - start) / Math.max(1, total) * 100)));
    $('progress').style.width = percent + '%';$('progress-label').textContent = percent + '%';
  }
  groups.forEach((g, i) => {const o = document.createElement('option');o.value = i;o.textContent = g.title;$('group').append(o);});
  $('search').addEventListener('input', () => {query = $('search').value.trim();renderNav();if (query || filter !== 'all' || $('group').value !== 'all') showResults();else renderChapter(active.id, '', false);});
  $('group').addEventListener('change', () => {renderNav();showResults();setMenu(false);window.scrollTo({top:0,behavior:'instant'});});
  document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {filter = b.dataset.filter;$('group').value = 'all';document.querySelectorAll('[data-filter]').forEach(x => {x.classList.toggle('active', x === b);x.setAttribute('aria-pressed', String(x === b));});renderNav();showResults();setMenu(false);window.scrollTo({top:0,behavior:'instant'});}));
  $('reset').addEventListener('click', reset);
  $('menu').addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $('backdrop').addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {e.preventDefault();if (window.innerWidth <= 760) setMenu(true);$('search').focus();}
    if (e.key === 'Escape') {setMenu(false);$('search').blur();$('menu').focus();}
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#chapter-"]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (location.hash === a.hash) route();else location.hash = a.hash;
    if (a.closest('#results')) {query='';$('search').value='';renderNav();}
  });
  function themeLabel() {
    const dark = document.documentElement.dataset.theme === 'dark';
    $('theme').innerHTML = (dark ? '☀' : '◐') + '<span>' + (dark ? '浅色' : '深色') + '</span>';
    $('theme').setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
  }
  $('theme').addEventListener('click', () => {const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('life-guide-theme',next);}catch{}themeLabel();});
  window.addEventListener('hashchange', route);
  window.addEventListener('scroll', updateProgress, {passive:true});
  window.addEventListener('resize', () => {if(window.innerWidth > 760) setMenu(false);updateProgress();});
  themeLabel(); route();
})();
