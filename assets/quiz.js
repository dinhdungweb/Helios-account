/* Lightweight quiz engine for Shopify section Quiz */
(function(){
  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  function parseJSON(text, fallback){
    try { return JSON.parse(text); } catch(e){ return fallback; }
  }

  function toBool(v){ return String(v).toLowerCase() === 'true'; }

  function bootQuiz(section){
    var id = section.id.replace('quiz-','');
    var cfgEl = $('#quiz-data-' + id);
    if(!cfgEl) return;
    var data = parseJSON(cfgEl.textContent || '{}', {});
    var method = section.dataset.method || 'highest_category';
    var showProgress = toBool(section.dataset.showProgress);
    var persist = toBool(section.dataset.persist);
    var restartEnabled = toBool(section.dataset.restartEnabled);

    var questions = Array.isArray(data.questions) ? data.questions : [];
    var results = Array.isArray(data.results) ? data.results : [];

    // Validate and normalise options & collect categories
    var categories = new Set();
    questions.forEach(function(q){
      if(typeof q.options === 'string'){ q.options = parseJSON(q.options, []); }
      q.options = Array.isArray(q.options) ? q.options : [];
      
      // Validate each option
      q.options = q.options.filter(function(opt){
        if(!opt || typeof opt !== 'object'){
          console.warn('Quiz: Invalid option format', opt);
          return false;
        }
        if(!opt.label){
          console.warn('Quiz: Option missing label', opt);
          return false;
        }
        return true;
      });
      
      q.options.forEach(function(opt){
        if(opt && opt.weights){ 
          Object.keys(opt.weights).forEach(function(k){ categories.add(k); }); 
        }
      });
    });

    var state = {
      index: 0,
      answers: new Array(questions.length).fill(null),
      scores: Array.from(categories).reduce(function(acc,k){ acc[k]=0; return acc; }, {}),
      tags: [],
      completed: false
    };

    var key = 'quiz-state-' + id;
    if(persist){
      var saved = parseJSON(localStorage.getItem(key) || '{}', {});
      if(saved && Array.isArray(saved.answers) && saved.scores){ state = Object.assign(state, saved); }
    }

    var elProgress = $('.quiz-progress', section);
    var elCard = $('.quiz-card', section);
    var elResult = $('.quiz-result', section);
    var elProgressBar = $('.quiz-progressbar__bar', section);

    function renderNoQuestions(){
      elCard.innerHTML = '<p>Chưa cấu hình câu hỏi cho quiz.</p>';
      elResult.hidden = true;
      section.classList.remove('show-result');
      elCard.setAttribute('data-state','question');
    }

    function renderProgress(){
      if(!showProgress) return;
      
      // Don't update if showing result (already at 100%)
      if(section.classList.contains('show-result')) return;
      
      var current = Math.min(state.index+1, questions.length);
      var total = questions.length;
      // Calculate progress: at question 1/5 = 0%, 2/5 = 20%, ..., 5/5 = 80%
      // Result screen will show 100%
      var pct = total ? Math.round(state.index / total * 100) : 0;
      elProgress.textContent = 'Câu ' + current + '/' + total;
      if(elProgressBar){
        elProgressBar.style.width = pct + '%';
        elProgressBar.parentElement && elProgressBar.parentElement.setAttribute('aria-valuenow', pct);
      }
    }

    function save(){ if(persist){ localStorage.setItem(key, JSON.stringify(state)); } }

    function renderQuestion(){
      var q = questions[state.index];
      if(!q){ return showResult(); }
      
      // Add loading state
      elCard.setAttribute('data-state', 'loading');
      
      renderProgress();
      elCard.innerHTML = '';
      var wrap = document.createElement('div');
      wrap.className = 'quiz-question';
      
      // Remove loading state after render
      setTimeout(function(){ elCard.setAttribute('data-state', 'question'); }, 50);

      // Media (left)
      if(q.image){
        var media = document.createElement('div');
        media.className = 'quiz-question__media';
        var img = document.createElement('img');
        img.src = q.image; img.alt = q.image_alt || q.text || '';
        media.appendChild(img);
        wrap.appendChild(media);
      }

      // Content (right)
      var content = document.createElement('div');
      content.className = 'quiz-question__content';
      var title = document.createElement('div');
      title.className = 'quiz-question__title';
      title.textContent = q.text || 'Câu hỏi';
      content.appendChild(title);

      var list = document.createElement('div');
      list.className = 'quiz-options';
      q.options.forEach(function(opt, i){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option';
        btn.textContent = opt.label || ('Lựa chọn ' + (i+1));
        btn.setAttribute('data-index', i);
        btn.setAttribute('aria-label', opt.label || ('Lựa chọn ' + (i+1)));
        
        // Add click handler with animation
        btn.addEventListener('click', function(){ 
          // Visual feedback
          btn.classList.add('quiz-option--selected');
          setTimeout(function(){ selectOption(i, opt); }, 200);
        });
        
        // Keyboard support
        btn.addEventListener('keydown', function(e){
          if(e.key === 'Enter' || e.key === ' '){
            e.preventDefault();
            btn.classList.add('quiz-option--selected');
            setTimeout(function(){ selectOption(i, opt); }, 200);
          }
        });
        
        list.appendChild(btn);
      });
      content.appendChild(list);

      var controls = document.createElement('div');
      controls.className = 'quiz-controls';
      if(state.index > 0){
        var back = document.createElement('button');
        back.className = 'quiz-btn-secondary';
        back.innerHTML = '← Quay lại';
        back.setAttribute('aria-label', 'Quay lại câu hỏi trước');
        back.addEventListener('click', function(){ 
          state.index--; 
          renderQuestion(); 
        });
        controls.appendChild(back);
      }
      content.appendChild(controls);
      wrap.appendChild(content);
      elCard.appendChild(wrap);
      section.classList.remove('show-result');
      elResult.hidden = true;
      elCard.setAttribute('data-state','question');
    }

    function selectOption(idx, opt){
      try {
        state.answers[state.index] = idx;
        if(opt && opt.weights){
          Object.keys(opt.weights).forEach(function(k){
            var val = Number(opt.weights[k]) || 0;
            state.scores[k] = (state.scores[k] || 0) + val;
          });
        }
        if(opt && Array.isArray(opt.tags)){
          state.tags = state.tags.concat(opt.tags);
        }
        // Next question or result
        state.index++;
        if(state.index >= questions.length){
          state.completed = true;
          save();
          showResult();
        } else {
          save();
          renderQuestion();
        }
      } catch(e) {
        console.error('Quiz: Error selecting option', e);
        elCard.innerHTML = '<p style="color:#ff6b6b;">Đã xảy ra lỗi. Vui lòng thử lại.</p>';
      }
    }

    function evaluateRules(rule){
      // Support { any: [cond...] } or { all: [cond...] }
      if(!rule || typeof rule !== 'object') return false;
      function checkCond(cond){
        if(cond.category){
          var sc = state.scores[cond.category] || 0;
          if(cond.gte != null && !(sc >= Number(cond.gte))) return false;
          if(cond.lte != null && !(sc <= Number(cond.lte))) return false;
          if(cond.eq  != null && !(sc === Number(cond.eq))) return false;
          return true;
        }
        if(cond.tags){
          var need = Array.isArray(cond.tags) ? cond.tags : [cond.tags];
          return need.some(function(t){ return state.tags.indexOf(t) !== -1; });
        }
        return false;
      }
      if(Array.isArray(rule.all)){
        return rule.all.every(checkCond);
      }
      if(Array.isArray(rule.any)){
        return rule.any.some(checkCond);
      }
      return false;
    }

    function pickResult(){
      try {
        if(method === 'rules'){
          for(var i=0;i<results.length;i++){
            var r = results[i];
            if(typeof r.rule === 'string'){ r.rule = parseJSON(r.rule, {}); }
            if(evaluateRules(r.rule)) return r;
          }
        }
        // highest_category fallback
        var bestKey = null, bestVal = -Infinity;
        var tiedKeys = []; // Track categories with same highest score
        
        // Find highest score
        Object.keys(state.scores).forEach(function(k){
          var val = state.scores[k] || 0;
          if(val > bestVal){ 
            bestVal = val; 
            bestKey = k;
            tiedKeys = [k]; // Reset tied keys
          } else if(val === bestVal && val > 0){
            tiedKeys.push(k); // Add to tied keys
          }
        });
        
        // If multiple categories tied, pick first one that has a result
        if(tiedKeys.length > 1){
          console.log('Quiz: Multiple categories tied with score ' + bestVal + ':', tiedKeys);
          for(var i=0; i<tiedKeys.length; i++){
            for(var j=0; j<results.length; j++){
              if(results[j].category_key === tiedKeys[i]) return results[j];
            }
          }
        }
        
        // Single winner or no tie
        for(var j=0;j<results.length;j++){
          if(results[j].category_key === bestKey) return results[j];
        }
        return results[0] || null;
      } catch(e) {
        console.error('Quiz: Error picking result', e);
        return results[0] || null;
      }
    }

    function showResult(){
      var r = pickResult();
      
      // Debug: Log result and scores
      console.log('Quiz scores:', state.scores);
      console.log('Quiz result:', r);
      
      if(!r){ 
        elCard.innerHTML = '<p style="color:#ff6b6b;">Không tìm thấy kết luận phù hợp. Vui lòng kiểm tra cấu hình.</p>'; 
        return; 
      }
      
      // Validate result has content
      if(!r.title && !r.desc){
        console.error('Quiz: Result has no title or description', r);
        elCard.innerHTML = '<p style="color:#ff6b6b;">Kết luận chưa có nội dung. Vui lòng cấu hình trong Theme Editor.</p>'; 
        return;
      }
      
      $('.quiz-result__title', section).textContent = r.title || 'Kết quả';
      $('.quiz-result__desc', section).innerHTML = r.desc || '<p>Chưa có mô tả.</p>';
      var media = $('.quiz-result__media', section);
      media.innerHTML = '';
      if(r.image){
        var img = document.createElement('img');
        img.src = r.image; img.alt = r.title || '';
        media.appendChild(img);
      }
      var ctaWrap = $('.quiz-result__cta', section);
      ctaWrap.innerHTML = '';
      if(r.cta && r.cta.label && r.cta.link){
        var a = document.createElement('a'); a.className='quiz-btn-primary'; a.href=r.cta.link; a.textContent=r.cta.label; ctaWrap.appendChild(a);
      }
      if(restartEnabled){
        var restart = document.createElement('button'); 
        restart.className='quiz-btn-secondary'; 
        restart.innerHTML='↻ Làm lại';
        restart.setAttribute('aria-label', 'Làm lại quiz từ đầu');
        restart.addEventListener('click', function(){ restartQuiz(); }); 
        ctaWrap.appendChild(restart);
      }

      // Toggle recommendations sets
      var sets = section.querySelectorAll('.quiz-reco-set');
      sets.forEach(function(s){ s.hidden = true; });
      var activeSet = document.getElementById('quiz-reco-' + r.id);
      if(activeSet){ activeSet.hidden = false; }

      section.classList.add('show-result');
      elResult.hidden = false; elCard.setAttribute('data-state','result');
      
      // Update progress to show completion
      if(showProgress){
        elProgress.textContent = 'Hoàn thành!';
      }
      if(elProgressBar){ 
        elProgressBar.style.width = '100%'; 
        elProgressBar.parentElement && elProgressBar.parentElement.setAttribute('aria-valuenow','100'); 
      }
    }

    function restartQuiz(){
      state.index = 0; state.answers = new Array(questions.length).fill(null);
      Object.keys(state.scores).forEach(function(k){ state.scores[k]=0; });
      state.tags = [];
      state.completed = false;
      save();
      // Explicitly clear and hide result UI
      section.classList.remove('show-result');
      elResult.hidden = true;
      var rt = $('.quiz-result__title', section);
      var rd = $('.quiz-result__desc', section);
      var rc = $('.quiz-result__cta', section);
      var rm = $('.quiz-result__media', section);
      if(rt) rt.textContent = '';
      if(rd) rd.innerHTML = '';
      if(rc) rc.innerHTML = '';
      if(rm) rm.innerHTML = '';
      // Hide any visible recommendation sets
      var sets = section.querySelectorAll('.quiz-reco-set');
      sets.forEach(function(s){ s.hidden = true; });
      if(elProgressBar){ elProgressBar.style.width = '0%'; elProgressBar.parentElement && elProgressBar.parentElement.setAttribute('aria-valuenow','0'); }
      renderQuestion();
      // Bring quiz into view for a clean restart
      if(section.scrollIntoView){ try { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(e){} }
    }

    // Normalise state if quiz structure changed
    if(state.answers.length !== questions.length){
      state.answers = new Array(questions.length).fill(null);
      state.index = 0;
      Object.keys(state.scores).forEach(function(k){ state.scores[k]=0; });
      state.completed = false;
      save();
    }

    // Start
    var total = questions.length;
    if(total === 0){ renderNoQuestions(); return; }

    var firstUnanswered = (function(){
      for(var i=0;i<total;i++){ if(state.answers[i] == null) return i; }
      return total;
    })();

    if(persist && state.completed && firstUnanswered === total){
      showResult();
    } else {
      state.index = Math.min(firstUnanswered, state.index || 0);
      if(state.index >= total) state.index = 0;
      renderQuestion();
    }
  }

  function init(){
    $all('.quiz-section').forEach(bootQuiz);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();