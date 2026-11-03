
'use strict';
/* FirstHello: a LOCAL demo. All people and replies are fictional.
   Browser localStorage is used for demonstration only. No accounts, no network
   friends and no real photo exchange exist in this prototype. */

const START_INTERESTS = ['Books','Music','Nature'];
const ALL_INTERESTS = ['Books','Music','Art','Coffee','Nature','Gaming','Movies','Cooking','Travel','Technology'];

const state = {
  view: 'discover', profiles: [], matches: [], active: 'nia', coach: null,
  connected: ['nia','sam'], chats: {}, quiz: {}, intro: false,
  user: null, onboardingInterests: START_INTERESTS.slice(),
  prefs: { interests: START_INTERESTS, genders:['woman','man','nonbinary'], theme:'blush', themeMode:'auto' },
  quizOpted: {}, quizResult:{}, simulatedPeerQuizPassed:{}, revealConsent:{}, simulatedPeerConsent:{},
};

const $ = (s)=>document.querySelector(s);
const esc = (value)=>String(value ?? '').replace(/[&<>"']/g, x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const getProfile = (id)=>state.profiles.find(p=>p.id===id);
const pronounText = (p)=>p.gender==='woman'?'She':p.gender==='man'?'He':'They';

function save() {
  try {
    localStorage.setItem('firsthello_demo_v3',JSON.stringify({
      user:state.user,
      connected:state.connected,
      chats:state.chats,
      prefs:state.prefs,
      quizOpted:state.quizOpted,
      quizResult:state.quizResult,
      simulatedPeerQuizPassed:state.simulatedPeerQuizPassed,
      revealConsent:state.revealConsent,
      simulatedPeerConsent:state.simulatedPeerConsent,
      intro:state.intro
    }));
  } catch (_) {}
}

function restore() {
  try {
    const obj=JSON.parse(localStorage.getItem('firsthello_demo_v3') || '{}');
    if (!obj || typeof obj!=='object') return;

    for (const key of [
      'user','connected','chats','prefs','quizOpted',
      'quizResult','simulatedPeerQuizPassed','revealConsent',
      'simulatedPeerConsent','intro'
    ]) {
      if(Object.prototype.hasOwnProperty.call(obj,key)) state[key]=obj[key];
    }

    if (!Array.isArray(state.connected)) state.connected=['nia','sam'];
    if (!state.chats || typeof state.chats!=='object') state.chats={};

    if (!state.prefs || typeof state.prefs!=='object') {
      state.prefs={interests:START_INTERESTS,genders:['woman','man','nonbinary'],theme:'blush'};
    }

    if (!['auto','custom'].includes(state.prefs.themeMode)) state.prefs.themeMode='custom';

    if (state.user && (!state.user.firstName ||
      !['woman','man','nonbinary','prefer_not_say'].includes(state.user.gender))) {
      state.user=null;
    }

    if (!Array.isArray(state.prefs.interests)) state.prefs.interests=START_INTERESTS;
    if (!Array.isArray(state.prefs.genders)) state.prefs.genders=['woman','man','nonbinary'];

    if (!['blush','charcoal','iridescent','neutral'].includes(state.prefs.theme)) {
      state.prefs.theme='blush';
    }

    for(const k of [
      'quizOpted','quizResult','simulatedPeerQuizPassed',
      'revealConsent','simulatedPeerConsent'
    ]) {
      if (!state[k] || typeof state[k]!=='object') state[k]={};
    }
  } catch(_) {}
}

async function getJson(url) {
  const res=await fetch(url);
  if(!res.ok) throw new Error('Request failed');
  return res.json();
}

async function postJson(url,data) {
  const res=await fetch(url,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(data)
  });
  const out=await res.json();
  if(!res.ok) throw new Error(out.error||'Request failed');
  return out;
}

function toast(message) {
  const t=$('#toast');
  t.textContent=message;
  t.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer=setTimeout(()=>t.classList.remove('show'),3500);
}

const themeForGender = (gender)=>
  gender==='woman'?'blush':
  gender==='man'?'charcoal':
  gender==='nonbinary'?'iridescent':'neutral';

function setTheme(theme, mode='custom') {
  state.prefs.theme=theme;
  state.prefs.themeMode=mode;
  document.documentElement.dataset.theme=theme;
  save();
}

function applyProfileTheme(gender) {
  if(state.prefs.themeMode==='auto') setTheme(themeForGender(gender),'auto');
}

function decorateSelf() {
  const name=state.user?.firstName || 'you';
  const avatar=$('.my-avatar');

  if(avatar) {
    avatar.textContent=name.charAt(0).toUpperCase();
    avatar.title='My space — '+name;
  }

  const welcome=$('#sidebar-greeting');
  if(welcome) welcome.textContent=state.user?`Hello, ${name}.`:'A place to be yourself.';
}


// ======================================================
// ONBOARDING
// ======================================================

function renderOnboarding() {
  const root = $('#onboarding-root');

  if (state.user) {
    root.replaceChildren();
    $('.app-shell').removeAttribute('inert');
    return;
  }

  $('.app-shell').setAttribute('inert', '');

  const choices = [
    ['woman', 'Female'],
    ['man', 'Male'],
    ['nonbinary', 'Non-binary'],
    ['prefer_not_say', 'Prefer not to say']
  ];

  root.innerHTML = `
    <div class="welcome-backdrop">
      <section class="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <div class="welcome-art">
          <span class="welcome-emblem">
            <img src="/firsthello-mark-small.png" alt="FirstHello logo" width="62" height="62">
          </span>
          <span class="eyebrow">YOUR FIRST HELLO</span>
          <h2>It's easier to connect when you can just be you.</h2>
          <p>Before you meet anyone, let's make this little corner of the internet yours.</p>
          <div class="welcome-orbit">
            <img src="/firsthello-mark.png" alt="" width="245" height="245">
          </div>
          <p class="welcome-privacy">No selfies. No public posts. Your details stay on this computer in this demo.</p>
        </div>

        <form class="welcome-form" id="welcome-form">
          <div class="section-label">WELCOME TO FIRSTHELLO</div>
          <h1 id="welcome-title">Let's begin with you.</h1>
          <p class="welcome-subtitle">Just a few things so FirstHello feels like your space.</p>

          <div class="welcome-two">
            <label class="form-field">
              <span>First name <b>*</b></span>
              <input id="welcome-first" name="firstName" required maxlength="60" autocomplete="given-name" placeholder="Your first name">
            </label>
            <label class="form-field">
              <span>Surname (optional)</span>
              <input name="lastName" maxlength="70" autocomplete="family-name" placeholder="Your surname">
            </label>
          </div>

          <fieldset class="welcome-fieldset">
            <legend>Gender</legend>
            <div class="gender-grid">
              ${choices.map(([v, label]) => `
                <label class="gender-tile">
                  <input type="radio" name="gender" value="${v}" required>
                  <span>${label}</span>
                </label>
              `).join('')}
            </div>
          </fieldset>

          <fieldset class="welcome-fieldset">
            <legend>Who would you like to meet?</legend>
            <div class="onboard-options">
              ${[['woman','Female'], ['man','Male'], ['nonbinary','Non-binary']].map(([id,label]) => `
                <label>
                  <input type="checkbox" name="seeking" value="${id}" checked> ${label}
                </label>
              `).join('')}
            </div>
          </fieldset>

          <fieldset class="welcome-fieldset">
            <legend>A few things you enjoy</legend>
            <div class="choices" id="onboard-interests">
              ${ALL_INTERESTS.map(i => chip(i, state.onboardingInterests.includes(i), 'onboard-interest', i)).join('')}
            </div>
          </fieldset>

          <label class="welcome-age">
            <input type="checkbox" name="adult" required>
            I'm 18 or older (the current demo is adults-only).
          </label>

          <button class="btn btn-primary welcome-submit" type="submit">
            Find your people <span>↗</span>
          </button>
          <p class="welcome-local">This is a local prototype with fictional adult profiles.</p>
        </form>
      </section>
    </div>
  `;

  $('#welcome-first')?.focus();
}

function submitWelcome(form) {
  if(!form.reportValidity()) return;

  const data=new FormData(form);
  const firstName=String(data.get('firstName')||'').trim();
  const lastName=String(data.get('lastName')||'').trim();
  const gender=String(data.get('gender')||'');

  if(!firstName || firstName.length>60 || lastName.length>70 ||
    !['woman','man','nonbinary','prefer_not_say'].includes(gender) ||
    !data.get('adult')) return;

  state.user={firstName,lastName,gender};
  state.prefs.genders=data.getAll('seeking').filter(x=>['woman','man','nonbinary'].includes(x));
  state.prefs.interests=state.onboardingInterests.slice();

  setTheme(themeForGender(gender),'auto');
  save();
  renderOnboarding();
  decorateSelf();

  updateMatches().then(()=>{
    render();
    toast(`Welcome to FirstHello, ${firstName}! ♡`);
  }).catch(()=>toast('Could not refresh matches.'));
}

function submitProfile(form) {
  if(!form.reportValidity()) return;

  const data=new FormData(form);
  const firstName=String(data.get('firstName')||'').trim();
  const lastName=String(data.get('lastName')||'').trim();
  const gender=String(data.get('gender')||'');

  if(!firstName || firstName.length>60 || lastName.length>70 ||
    !['woman','man','nonbinary','prefer_not_say'].includes(gender)) return;

  state.user={firstName,lastName,gender};
  applyProfileTheme(gender);
  save();
  decorateSelf();
  render();
  toast('Your profile has been updated.');
}


// ======================================================
// PROFILES AND NAVIGATION
// ======================================================

function avatar(p,extra='') {
  const identityPalette=p.gender==='woman'?'peach':
    p.gender==='man'?'charcoal':
    p.gender==='nonbinary'?'iridescent':'sage';

  return `<span class="profile-avatar ${identityPalette} ${extra}" aria-label="An abstract avatar, not a photograph">${esc(p.symbol)}</span>`;
}

function nav(view) {
  if(!state.user) return;
  state.view=view;
  document.querySelectorAll('.nav-button').forEach(
    b=>b.classList.toggle('active',b.dataset.screen===view)
  );
  render();
  window.scrollTo({top:0,behavior:'smooth'});
}

async function updateMatches() {
  state.matches=await postJson('/api/matches',{
    interests:state.prefs.interests,
    genders:state.prefs.genders
  });
}

function titleblock(eyebrow,title,subtitle) {
  return `<div class="page-intro"><span class="eyebrow">${esc(eyebrow)}</span><h1>${title}</h1><p>${esc(subtitle)}</p></div>`;
}

function profileCard(p) {
  const connected=state.connected.includes(p.id);

  return `<article class="profile-card">
    <div class="profile-header">
      ${avatar(p)}
      <div>
        <div class="profile-name">${esc(p.name)}, ${p.age}</div>
        <div class="profile-age">${esc(p.pace)} pace · ${p.gender==='nonbinary'?'Non-binary':p.gender==='woman'?'Female':'Male'}</div>
      </div>
    </div>
    <p class="bio">“${esc(p.bio)}”</p>
    <div class="pills">
      ${p.interests.slice(0,4).map(t=>
        `<span class="pill ${p.shared.includes(t)?'shared':''}">${esc(t)}${p.shared.includes(t)?' ✦':''}</span>`
      ).join('')}
    </div>
    <div class="profile-footer">
      <div class="profile-match">
        <span class="label-dot"></span>
        <b>${p.shared_count} common ${p.shared_count===1?'interest':'interests'}</b>
      </div>
      <button class="btn ${connected?'btn-secondary':'btn-primary'} btn-small" data-action="connect" data-id="${esc(p.id)}">
        ${connected?'Continue chatting ↗':'Say hello ↗'}
      </button>
    </div>
  </article>`;
}


// ======================================================
// DISCOVER
// ======================================================

function renderDiscover() {
  const shown=state.matches;

  return `<section class="hero">
    <div class="hero-text">
      <div class="eyebrow">ONE PERSON AT A TIME</div>
      <h1>Good friendships<br>start somewhere${state.user?', '+esc(state.user.firstName):''}.</h1>
      <p>No swiping through faces. Just shared interests, thoughtful conversations, and the freedom to take things slowly.</p>
      <button class="btn btn-primary" data-screen="messages">Your conversations <span>↗</span></button>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="orbits">
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>
        <div class="orb orb-one">✿</div>
        <div class="orb orb-two">♡</div>
        <div class="orb orb-three">✦</div>
      </div>
      <span class="scribble">hello, slowly.</span>
    </div>
  </section>

  <div class="section-row">
    <div>
      <div class="section-label">A LITTLE COMMON GROUND</div>
      <h2>People you might click with</h2>
    </div>
    <button class="btn btn-outline btn-small" data-screen="myspace">✎ Change interests</button>
  </div>

  ${shown.length
    ? `<div class="cards">${shown.map(profileCard).join('')}</div>`
    : '<div class="no-results">No demo profiles match these filters. You can change who you’d like to meet in My space.</div>'
  }

  <div class="info-strip">
    <span>♡</span> Nobody’s face is shown while browsing. Demo avatar colours reflect each fictional profile's gender, while everyone's app theme remains a personal choice. All profiles are fictional adults for this prototype.
  </div>`;
}


// ======================================================
// MESSAGES
// ======================================================

function lastLine(id) {
  const data=state.chats[id]||[];
  return data.length?data[data.length-1].text:'Start a gentle conversation';
}

function renderMessages() {
  const friends=state.connected.map(getProfile).filter(Boolean);

  if(!friends.length) {
    return `${titleblock(
      'JUST YOU AND SOMEONE NEW',
      'Private conversations',
      'One-on-one chats without an audience or pressure.'
    )}
    <div class="empty-state">
      <h3>No chats yet</h3>
      <p>Go to Discover to say hello to someone.</p>
      <button class="btn btn-primary" data-screen="discover">Discover people</button>
    </div>`;
  }

  if(!state.connected.includes(state.active)) state.active=state.connected[0];

  const p=getProfile(state.active);
  const messages=state.chats[p.id]||[];

  return `<div class="page-intro" style="padding-bottom:15px">
    <span class="eyebrow">ONE-ON-ONE, ALWAYS YOUR CHOICE</span>
    <h1>Conversations, not crowds.</h1>
    <p>Take your time. You don't need the perfect words, and nobody's watching.</p>
  </div>

  <div class="messages-layout">
    <aside class="chat-list">
      <h3>Your chats <span class="tag">demo</span></h3>
      ${friends.map(f=>`
        <button class="${f.id===p.id?'active':''}" data-action="open-chat" data-id="${esc(f.id)}">
          ${avatar(f)}
          <span>
            <b>${esc(f.name)}</b>
            <span class="smalltext">${esc(lastLine(f.id))}</span>
          </span>
        </button>
      `).join('')}
    </aside>

    <section class="chat-panel">
      <div class="chat-top">
        ${avatar(p)}
        <div class="friend-meta">
          <b>${esc(p.name)}</b>
          <small>Fictional character · ${esc(p.pace)} · No read receipts</small>
        </div>
        <button class="btn btn-outline btn-small" data-action="reveal" data-id="${p.id}" title="Mutual reveal preview">◈ Reveal</button>
      </div>

      <div class="chat-messages" id="chat-scroll" aria-label="Fictional demo conversation">
        <div class="chat-system">Practice chat with a fictional profile. Nothing is sent to real people.</div>
        ${messages.map(m=>`
          <div class="bubble ${m.role==='me'?'mine':''}">${esc(m.text)}</div>
        `).join('')}
      </div>

      <div class="${state.coach && state.coach.profileId===p.id?'coach':'hide'}" id="coach-suggestions">
        ${renderCoach()}
      </div>

      <div class="chat-compose">
        <div class="flex-between" style="margin-bottom:10px">
          <span class="hint">Just you and ${esc(p.name)}.</span>
          <button class="btn btn-secondary btn-small" data-action="coach" data-id="${p.id}">✧ Conversation Coach</button>
        </div>

        <form id="message-form">
          <input name="message" id="compose-input" placeholder="Say whatever feels natural…" autocomplete="off" maxlength="800" aria-label="Message a fictional friend">
          <button type="submit" class="btn btn-primary">Send ↗</button>
        </form>

        <div class="micro">
          Demo messages remain in this browser. Replies are scripted, not from real people. The coach never sends on your behalf.
        </div>
      </div>
    </section>
  </div>`;
}


function renderCoach() {
  if (!state.coach || state.coach.profileId !== state.active) {
    return '';
  }

  const d = state.coach.data;

  const isAI = d.mode === 'local_ollama_ai';

  const sourceLabel = isAI
    ? 'Local AI (' + esc(d.model || 'Ollama') +
      ') · Selected tool: ' + esc(d.tool_used) + '.'
    : 'Offline guidance (not generated by AI). ' +
      esc(d.fallback_reason || '');

  return `
    <div class="coach-header">
      <b>✧ A little help finding the words</b>
      <button class="btn btn-ghost btn-small"
        data-action="close-coach"
        aria-label="Close suggestions">✕</button>
    </div>

    <div class="why">${esc(d.reason)}</div>

    ${d.suggestions.map((text, i) => `
      <button class="coach-choice"
        data-action="use-suggestion"
        data-index="${i}">
        ${esc(text)}
        <span class="text-accent">↗</span>
      </button>
    `).join('')}

    <div class="coach-tip">
      ${sourceLabel}
      Choosing fills your draft only.
      You decide whether to send.
    </div>
  `;
}



// ======================================================
// MY CIRCLE
// ======================================================

function renderConnections() {
  return `${titleblock(
    'FRIENDSHIPS CAN GROW NATURALLY',
    'From one hello to a little circle.',
    'You never need to post in a public group. Begin one-on-one; introductions and private circles can come later, with everyone’s permission.'
  )}

  <div class="two-col">
    <article class="panel">
      <div class="section-label">HOW CIRCLES GROW</div>
      <h3>Already connected, one by one.</h3>

      <div class="circle-visual" aria-label="You connect individually to Nia and Sam; a dotted line represents a possible future introduction">
        <div class="circle-line cv-line-left"></div>
        <div class="circle-line cv-line-right"></div>
        <div class="circle-line cv-line-base"></div>
        <div class="cv-node cv-me">You</div>
        <div class="cv-node cv-nia">✿</div>
        <div class="cv-node cv-sam">◈</div>
      </div>

      <p>You know Nia and Sam separately. A small circle is possible only when everyone is comfortable and opts in.</p>

      <button class="btn btn-primary btn-small" data-action="intro">
        ${state.intro?'Introduction idea saved ✓':'Explore an introduction ↗'}
      </button>
      <p class="hint" style="margin-top:12px">This is a local preview—no invitation is sent to anyone.</p>
    </article>

    <article class="panel">
      <div class="section-label">NO SOCIAL PRESSURE</div>
      <h3>Belonging doesn't need an audience.</h3>
      <p>We won't show follower counts, online status or read receipts, and we don't reward daily reply streaks.</p>

      <div class="stack" style="margin:20px 0">
        <span class="pill">♡ Private introductions</span>
        <span class="pill">✧ One-on-one first</span>
        <span class="pill">◌ Small circles only by invitation</span>
        <span class="pill">☾ Quiet periods are okay</span>
      </div>

      <div class="quiet-panel">
        <b>Future feature:</b> Real friends can independently approve a mutual introduction. Three people who already know each other can later opt into a private circle. That real multi-user permission system is not part of this demo.
      </div>
    </article>
  </div>`;
}


// ======================================================
// MY SPACE
// ======================================================

function chip(label,selected,action,value) {
  return `<button class="chip-choice ${selected?'chosen':''}" data-action="${action}" data-value="${esc(value)}" aria-pressed="${selected?'true':'false'}">${esc(label)}</button>`;
}

function renderMySpace() {
  const p=state.prefs;

  return `${titleblock(
    'THE WAY YOU ARE IS ENOUGH',
    'Make this space yours.',
    'Choose what feels comfortable. Nothing here is based on how outgoing you are supposed to be.'
  )}

  <section class="panel personal-panel">
    <div class="section-label">YOUR FIRSTHELLO PROFILE</div>
    <h3>Who you are, at your own pace.</h3>
    <p>Your surname and gender are stored only in this browser for the demo; no real users can see them. Only your first name appears in this preview.</p>

    <form id="profile-form" class="profile-form">
      <div class="welcome-two">
        <label class="form-field">
          <span>First name</span>
          <input name="firstName" maxlength="60" required value="${esc(state.user?.firstName||'')}">
        </label>

        <label class="form-field">
          <span>Surname <small>(private, optional)</small></span>
          <input name="lastName" maxlength="70" value="${esc(state.user?.lastName||'')}">
        </label>
      </div>

      <label class="form-field profile-gender">
        <span>Gender</span>
        <select name="gender">
          ${[
            ['woman','Female'],
            ['man','Male'],
            ['nonbinary','Non-binary'],
            ['prefer_not_say','Prefer not to say']
          ].map(([id,label])=>`
            <option value="${id}" ${state.user?.gender===id?'selected':''}>${label}</option>
          `).join('')}
        </select>
      </label>

      <div class="form-actions">
        <button class="btn btn-primary btn-small" type="submit">Save my profile</button>
        <span class="hint">Changing gender updates your palette only while automatic theme selection is on.</span>
      </div>
    </form>
  </section>

  <div class="two-col">
    <section class="panel">
      <div class="section-label">MATCHING YOUR INTERESTS</div>
      <h3>Things you love talking about</h3>
      <p>Pick as many as you like. Shared interests influence discovery, not a judgement of compatibility.</p>

      <div class="choices">
        ${ALL_INTERESTS.map(i=>chip(
          i,
          p.interests.includes(i),
          'toggle-interest',
          i
        )).join('')}
      </div>

      <div class="pref-field" style="margin-top:30px">
        <label class="heading">Who would you feel comfortable connecting with?</label>
        <div class="choices">
          ${[
            ['woman','Female'],
            ['man','Male'],
            ['nonbinary','Non-binary']
          ].map(([v,k])=>chip(
            k,
            p.genders.includes(v),
            'toggle-gender',
            v
          )).join('')}
        </div>
        <p class="pref-help">Your choice, no judgement. You can update it whenever you want.</p>
      </div>

      <div class="quiet-panel">
        This prototype only includes fictional people aged 18+. Friendship preferences are independent of your gender and colour theme.
      </div>
    </section>

    <section class="panel">
      <div class="section-label">YOUR VISUAL COMFORT</div>
      <h3>Pick your atmosphere</h3>
      <p>FirstHello suggests peach/pink for Female, charcoal/grey for Male, peach with a barely-there rainbow glow for Non-binary, and calm sage for Prefer not to say. Every palette is available to everyone.</p>

      <button class="btn btn-outline btn-small auto-theme" data-action="auto-theme">
        Use suggested theme for my profile ${p.themeMode==='auto'?'✓':''}
      </button>

      <div class="setting-tiles">
        ${[
          ['blush','Soft blush',['#f8e2df','#d6a4a8','#9c697f']],
          ['charcoal','Charcoal',['#575757','#343434','#111111']],
          ['iridescent','Peach glow',['#f8e2df','#e8d5d8','#d7afbd']],
          ['neutral','Sage',['#e5e8df','#b7cbbd','#6d826f']]
        ].map(([id,name,colors])=>`
          <button data-action="set-theme" data-value="${id}" class="theme-tile ${p.theme===id?'chosen':''}">
            <span class="theme-preview">
              ${colors.map(c=>`<i style="background:${c}"></i>`).join('')}
            </span>
            ${name}
          </button>
        `).join('')}
      </div>

      <div class="quiet-panel">
        ◈ Faces are not part of matching. Every fictional profile uses a self-chosen abstract avatar. Real photos would be private until both friends explicitly agree to reveal.
      </div>

      <div style="margin-top:28px">
        <button class="btn btn-outline btn-small" data-action="reset">Reset local demo data</button>
        <div class="pref-help">Erases your fictional chats, preferences and reveal choices from this browser.</div>
      </div>
    </section>
  </div>`;
}


// ======================================================
// MAIN RENDERING — FIXED
// ======================================================

function render() {
  decorateSelf();

  document.querySelectorAll('.nav-button').forEach(b =>
    b.classList.toggle('active',b.dataset.screen===state.view)
  );

  const root=$('#app-content');

  root.innerHTML=
    state.view==='discover'?renderDiscover():
    state.view==='messages'?renderMessages():
    state.view==='connections'?renderConnections():
    renderMySpace();

  if(state.view==='myspace') {
    showMemoryPanel();
  }

  if(state.view==='messages') {
    const area=$('#chat-scroll');
    if(area) area.scrollTop=area.scrollHeight;
    showMemoryDemo();
  }
}


// ======================================================
// SCRIPTED CHAT REPLIES
// ======================================================

function simulateReply(p,text) {
  const lower=text.toLowerCase();
  const topic=p.interests.find(i=>lower.includes(i.toLowerCase()));
  if (p.id === 'theo' && /\b(birthday|date of birth)\b/i.test(text)) {
  return "My birthday is on 21 June.";
}

  if(lower.includes('?')) {
    return `I love that question. ${topic?`${topic} is one of those things I could talk about for ages. `:''}What do you think?`;
  }

  if(/(sad|lonely|stressed|hard day|difficult)/i.test(text)) {
    return "Sorry it's been a tough time. I'm glad you felt okay saying that. No pressure to reply quickly.";
  }

  if(/(hi|hello|hey)/i.test(text)) {
    return `Hey! It's nice to hear from you. How's your day been?`;
  }

  return topic
    ? `I love ${topic.toLowerCase()} too! How did you get into it?`
    : `That sounds interesting! Tell me more if you feel like it.`;
}

async function connectTo(id) {
  const p=getProfile(id);
  if(!p) return;

  if(!state.connected.includes(id)) {
    state.connected.push(id);
    if(!state.chats[id]) {
      state.chats[id]=await getJson('/api/history/'+encodeURIComponent(id));
    }
    save();
    toast(`A gentle hello to ${p.name} — this is a practice chat.`);
  }

  state.active=id;
  state.coach=null;
  nav('messages');
}


// ======================================================
// CONVERSATION COACH
// ======================================================

async function showCoach(id) {
  const button=document.querySelector(
    `[data-action="coach"][data-id="${id}"]`
  );

  if(button?.disabled) return;

  if(button) {
    button.disabled=true;
    button.textContent="✧ Thinking…";
  }

  const chat=state.chats[id]||[];

  try {
    const data=await postJson("/api/coach",{
      profile_id:id,
      interests:state.prefs.interests,
      recent:chat.slice(-12)
    });

    if(state.active===id) {
      state.coach={profileId:id,data};
      render();
      toast("Three editable ideas, just for you.");
    }
  } catch(e) {
    toast("Could not prepare suggestions: "+e.message);
  } finally {
    if(button?.isConnected) {
      button.disabled=false;
      button.textContent="✧ Conversation Coach";
    }
  }
}


// ======================================================
// REVEAL AND CONNECTION CHECK
// ======================================================

function dialog(html) {
  $('#dialog-root').innerHTML=`
    <div class="dialog-overlay" data-overlay="true">
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Friendship reveal options">
        ${html}
      </div>
    </div>`;
}

function closeDialog() {
  $('#dialog-root').replaceChildren();
}

async function openReveal(id) {
  const p=getProfile(id);
  if(!p) return;

  const opted=!!state.quizOpted[id];
  const score=state.quizResult[id];
  const consentA=!!state.revealConsent[id];
  const consentB=!!state.simulatedPeerConsent[id];

  const checked=opted
    ? (score>=80 && !!state.simulatedPeerQuizPassed[id] && consentA && consentB)
    : (consentA && consentB);

  let extra='';

  if(!checked) {
    extra=`
      <p class="hint">
        A face reveal should never happen without both people's permission. This prototype has no real photos or real people. You can explore the process below.
      </p>

      <label class="checkbox-line">
        <input type="checkbox" id="quiz-option" ${opted?'checked':''}>
        <span>We want an optional 5-question friendship check before a reveal (80% for each person).</span>
      </label>

      ${opted?`
        <div class="score-dial">
          <strong>${score===undefined?'—':score+'%'}</strong>
          <span class="hint">Your demo knowledge check · target 80%</span>
        </div>

        <button class="btn btn-secondary btn-small" data-action="start-quiz" data-id="${id}">
          ${score===undefined?'Take the connection check':'Retake the connection check'}
        </button>

        <label class="checkbox-line">
          <input id="peer-demo-quiz" type="checkbox" ${state.simulatedPeerQuizPassed[id]?'checked':''}>
          <span>Simulate ${esc(p.name)} scoring 80% or higher in <b>their own separate</b> fictional check. (Not a real score.)</span>
        </label>
      `:''}

      <label class="checkbox-line">
        <input id="self-consent" type="checkbox" ${consentA?'checked':''}>
        <span><b>I choose</b> to reveal my identity in this demonstration.</span>
      </label>

      <label class="checkbox-line">
        <input id="demo-peer-consent" type="checkbox" ${consentB?'checked':''}>
        <span><b>Simulate ${esc(p.name)} agreeing</b> (fictional consent for demonstration only).</span>
      </label>

      <button class="btn btn-primary" data-action="confirm-reveal" data-id="${id}">
        Preview mutual reveal ↗
      </button>`;
  } else {
    extra=`
      <div class="reveal-card">
        ${avatar(p)}
        <h3>Meet ${esc(p.name)} ✿</h3>
        <p class="hint">Identity card preview only. Not a real face photograph.</p>
      </div>

      <p class="hint">
        Both sides have been consented to in this local simulation${opted?' and the optional connection check requirement was met':''}. In a real app, two authenticated users would have to agree separately.
      </p>

      <button class="btn btn-outline btn-small" data-action="undo-reveal" data-id="${id}">
        Lock this preview again
      </button>`;
  }

  dialog(`
    <div class="dialog-title">
      <div>
        <div class="section-label">THE REVEAL IS YOUR CHOICE</div>
        <h2 style="margin-top:9px">Faces, later. Connection, first.</h2>
      </div>
      <button class="dialog-close" data-action="close-dialog">✕</button>
    </div>

    <p class="hint">Only after a genuine mutual decision. A test score never proves trust or safety; you can choose not to reveal at all.</p>
    ${extra}`);
}

async function openQuiz(id) {
  const data=await getJson('/api/quiz/'+id);

  dialog(`
    <div class="dialog-title">
      <div>
        <div class="section-label">OPTIONAL CONNECTION CHECK</div>
        <h2 style="margin-top:9px">Little things you remember.</h2>
      </div>
      <button class="dialog-close" data-action="close-dialog">✕</button>
    </div>

    <p class="hint">
      Five open questions based on neutral details in ${esc(getProfile(id).name)}'s <b>fictional demo chat</b>. No health, location or intimate information. At least four correct answers reaches 80%.
    </p>

    <form id="quiz-form" data-profile="${id}">
      ${data.questions.map((q,i)=>`
        <div class="quiz-question">
          <label for="q${i}">${i+1}. ${esc(q)}</label>
          <input id="q${i}" name="answer${i}" autocomplete="off" required maxlength="300" placeholder="Your own words">
        </div>
      `).join('')}

      <button type="submit" class="btn btn-primary">
        Check what I remember ↗
      </button>
    </form>`);
}

async function submitQuiz(form) {
  const id=form.dataset.profile;
  const answers=[...form.querySelectorAll('input')].map(i=>i.value);

  try {
    const result=await postJson('/api/quiz/score',{
      profile_id:id,
      answers
    });

    state.quizResult[id]=result.percentage;
    save();

    dialog(`
      <div class="dialog-title">
        <h2>Your connection check</h2>
        <button class="dialog-close" data-action="close-dialog">✕</button>
      </div>

      <div class="score-dial">
        <strong>${result.percentage}%</strong>
        <span class="hint">
          ${result.threshold_met
            ? 'You reached the optional 80% threshold.'
            : 'Not quite 80% yet. It’s okay—this is not a competition.'}
        </span>
      </div>

      <div class="stack">
        ${result.correct.map((c,i)=>`
          <div class="hint">
            ${c?'✓':'○'} Question ${i+1} · ${c?'Matched a known demo detail':'Couldn’t match a known detail'}
          </div>
        `).join('')}
      </div>

      <p class="hint" style="margin-top:12px">
        This keyword check is basic and can mark equivalent wording incorrectly. The quiz is never proof of trustworthiness.
      </p>

      <button class="btn btn-primary" data-action="reveal" data-id="${id}">
        Return to reveal preferences
      </button>`);
  } catch(e) {
    toast('Could not score the check: '+e.message);
  }
}

function confirmReveal(id) {
  const a=$('#self-consent');
  const b=$('#demo-peer-consent');
  const q=$('#quiz-option');
  const peerQuiz=$('#peer-demo-quiz');

  state.revealConsent[id]=!!a?.checked;
  state.simulatedPeerConsent[id]=!!b?.checked;
  state.quizOpted[id]=!!q?.checked;
  state.simulatedPeerQuizPassed[id]=!!peerQuiz?.checked;

  save();

  if(!state.revealConsent[id] || !state.simulatedPeerConsent[id]) {
    toast('Both people must consent before any reveal.');
  } else if(state.quizOpted[id] &&
    (!Number.isFinite(state.quizResult[id]) ||
    state.quizResult[id]<80 ||
    !state.simulatedPeerQuizPassed[id])) {
    toast('Both fictional quiz scores must reach 80% before the optional reveal.');
  } else {
    toast('Mutual choices confirmed for the fictional preview.');
  }

  openReveal(id);
}

function resetDemo() {
  if(!window.confirm('Reset all fictional chats and preferences stored in this browser?')) return;
  localStorage.removeItem('firsthello_demo_v3');
  window.location.reload();
}


// ======================================================
// BUTTON ACTIONS
// ======================================================

async function doAction(b) {
  const a=b.dataset.action;
  const id=b.dataset.id;
  const value=b.dataset.value;

  if(a==='connect') return connectTo(id);

  if(a==='open-chat') {
    state.active=id;
    state.coach=null;
    return render();
  }

  if(a==='coach') return showCoach(id);

  if(a==='close-coach') {
    state.coach=null;
    return render();
  }

  if(a==='use-suggestion') {
    const str=state.coach?.data.suggestions[Number(b.dataset.index)];
    const input=$('#compose-input');

    if(input && str) {
      input.value=str;
      input.focus();
      toast('Suggestion added to your draft. Edit it if you like.');
    }
    return;
  }

  if(a==='reveal') return openReveal(id);
  if(a==='close-dialog') return closeDialog();
  if(a==='start-quiz') return openQuiz(id);
  if(a==='confirm-reveal') return confirmReveal(id);

  if(a==='undo-reveal') {
    state.revealConsent[id]=false;
    state.simulatedPeerConsent[id]=false;
    save();
    return openReveal(id);
  }

  if(a==='onboard-interest') {
    state.onboardingInterests=state.onboardingInterests.includes(value)
      ? state.onboardingInterests.filter(i=>i!==value)
      : [...state.onboardingInterests,value];

    const chips=$('#onboard-interests');
    if(chips) {
      chips.innerHTML=ALL_INTERESTS.map(i=>chip(
        i,
        state.onboardingInterests.includes(i),
        'onboard-interest',
        i
      )).join('');
    }
    return;
  }

  if(a==='auto-theme') {
    setTheme(themeForGender(state.user?.gender),'auto');
    return render();
  }

  if(a==='toggle-interest') {
    state.prefs.interests=state.prefs.interests.includes(value)
      ? state.prefs.interests.filter(i=>i!==value)
      : [...state.prefs.interests,value];

    save();
    await updateMatches();
    return render();
  }

  if(a==='toggle-gender') {
    state.prefs.genders=state.prefs.genders.includes(value)
      ? state.prefs.genders.filter(g=>g!==value)
      : [...state.prefs.genders,value];

    save();
    await updateMatches();
    return render();
  }

  if(a==='set-theme') {
    setTheme(value);
    return render();
  }

  if(a==='intro') {
    state.intro=true;
    save();
    render();
    return toast('Introduction idea saved locally. Nobody has been contacted.');
  }

  if(a==='reset') return resetDemo();
}


// ======================================================
// SENDING MESSAGES
// ======================================================

function sendMessage(form) {
  const input=form.querySelector('input');
  const text=input.value.trim();
  if(!text) return;

  const id=state.active;
  const p=getProfile(id);
  if(!p) return;

  const list=state.chats[id]||[];

 list.push({role:'me',text});

const reply = simulateReply(p,text);
list.push({role:'friend',text:reply});
  state.chats[id]=list.slice(-120);

  save();
  state.coach=null;
  render();
  $('#compose-input')?.focus();
  if (/\bmy birthday\b/i.test(reply)) {
  suggestFriendBirthday(id, reply);
}
}


// ======================================================
// INITIALISATION
// ======================================================

async function init() {
  restore();
  document.documentElement.dataset.theme=state.prefs.theme;

  try {
    state.profiles=await getJson('/api/profiles');
    await updateMatches();

    for(const id of ['nia','sam']) {
      if(!state.chats[id]) {
        state.chats[id]=await getJson('/api/history/'+id);
      }
    }

    save();
    render();
    renderOnboarding();
  } catch(e) {
    $('#app-content').innerHTML=`
      <div class="panel">
        <h2>We couldn't start the demo.</h2>
        <p>${esc(e.message)}</p>
        <p>Please keep the Python command window running and refresh this page.</p>
      </div>`;
  }
}


// ======================================================
// EVENT LISTENERS
// ======================================================

document.addEventListener('click',async e=>{
  const sb=e.target.closest('[data-screen]');
  if(sb) {
    nav(sb.dataset.screen);
    return;
  }

  const b=e.target.closest('[data-action]');
  if(b) {
    try {
      await doAction(b);
    } catch(err) {
      toast('Something went wrong: '+err.message);
    }
    return;
  }

  if(e.target.dataset.overlay==='true') closeDialog();
});

document.addEventListener('submit',e=>{
  if(e.target.id==='welcome-form') {
    e.preventDefault();
    submitWelcome(e.target);
    return;
  }

  if(e.target.id==='profile-form') {
    e.preventDefault();
    submitProfile(e.target);
    return;
  }

  if(e.target.id==='message-form') {
    e.preventDefault();
    sendMessage(e.target);
  }

  if(e.target.id==='quiz-form') {
    e.preventDefault();
    submitQuiz(e.target);
  }
});

document.addEventListener('change',e=>{
  if(e.target.name==='gender' && e.target.closest('#welcome-form')) {
    document.documentElement.dataset.theme=themeForGender(e.target.value);
  }

  if(e.target.id==='quiz-option') {
    const id=state.active;
    state.quizOpted[id]=e.target.checked;
    save();
    openReveal(id);
  }
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape') closeDialog();
});

$('#theme-cycle').addEventListener('click',()=>{
  const themes=['blush','charcoal','iridescent','neutral'];
  setTheme(themes[(themes.indexOf(state.prefs.theme)+1)%themes.length],'custom');
  render();
});

init();


// ======================================================
// BIRTHDAY REMINDER
// ======================================================

async function showBirthdayReminder() {
  try {
    const demoMode=new URLSearchParams(window.location.search)
      .get('birthday-demo')==='1';

    const data=await getJson(
      demoMode
        ? '/api/birthday-reminders?demo=1'
        : '/api/birthday-reminders'
    );

    if(!data.reminders || data.reminders.length===0) return;

    const card=document.createElement('section');
    card.className='panel';
    card.style.margin='14px clamp(24px, 4.6vw, 75px)';
    card.style.padding='16px 20px';

    const heading=document.createElement('strong');
    heading.textContent='🎂 Test: A little friendship reminder';

    const message=document.createElement('p');
    message.style.marginTop='8px';
    message.textContent=data.reminders.join(' ');

    card.append(heading,message);

    const button=document.createElement('button');
    button.type='button';
    button.className='btn btn-secondary btn-small';
    button.textContent='Draft a birthday wish';
    button.style.marginTop='12px';

    button.addEventListener('click',()=>{
      state.active='nia';
      state.coach=null;
      nav('messages');

      const input=document.querySelector('#compose-input');
      if(input) {
        input.value='Happy birthday, Nia! 🎂 I hope you have a lovely day.';
        input.focus();
        toast('You can edit this message before sending.');
      }
    });

    card.append(button);
    document.querySelector('#app-content').before(card);
  } catch(error) {
    console.error('Birthday reminder error:',error);
  }
}

showBirthdayReminder();


// ======================================================
// SAVED BIRTHDAYS PANEL — FIXED
// ======================================================

async function showMemoryPanel() {
  document.querySelector('#memory-panel')?.remove();
  if(state.view!=='myspace') return;

  const panel=document.createElement('section');
  panel.id='memory-panel';
  panel.className='panel';
  panel.style.marginTop='20px';

  panel.innerHTML=`
    <div class="section-label">FRIENDSHIP MEMORY · DEMO</div>
    <h3>Saved birthdays</h3>
    <p>View, correct or delete your fictional friendship memories.</p>
    <div class="memory-list">Loading birthdays…</div>
  `;

  $('#app-content').append(panel);

  try {
    const data=await getJson('/api/birthdays');
    const rows=Object.entries(data.birthdays||{});

    const months=[
      'January','February','March','April',
      'May','June','July','August',
      'September','October','November','December'
    ];

    const list=panel.querySelector('.memory-list');

    list.innerHTML=rows.length
      ? rows.map(([name,birthday],index)=>`
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 0;border-top:1px solid #ddd">
          <strong style="margin-right:auto">
            ${esc(name)} — ${esc(birthday.day)} ${months[birthday.month-1]||'Unknown month'}
          </strong>

          <button class="btn btn-outline btn-small" data-memory="edit" data-index="${index}">
            Edit
          </button>
          <button class="btn btn-outline btn-small" data-memory="delete" data-index="${index}">
            Delete
          </button>
        </div>
      `).join('')
      : '<p>No birthdays saved yet.</p>';

    panel.addEventListener('click',async event=>{
      const button=event.target.closest('[data-memory]');
      if(!button) return;

      const [friend,birthday]=rows[Number(button.dataset.index)];

      try {
        if(button.dataset.memory==='delete') {
          if(!window.confirm(`Delete the saved birthday for ${friend}?`)) return;

          await postJson('/api/birthdays/delete',{
            friend,
            confirmed:true
          });

          toast('Birthday deleted.');
        } else {
          const dateText=window.prompt(
            `New birthday for ${friend} (MM-DD):`,
            `${birthday.month}-${birthday.day}`
          );

          if(dateText===null) return;

          const found=/^(\d{1,2})-(\d{1,2})$/.exec(dateText.trim());

          if(!found) {
            toast('Use MM-DD, such as 11-08.');
            return;
          }

          await postJson('/api/birthdays/edit',{
            friend,
            month:Number(found[1]),
            day:Number(found[2]),
            consent:true
          });

          toast('Birthday updated.');
        }

        if(state.view==='myspace') showMemoryPanel();
      } catch(error) {
        toast('Memory change failed: '+error.message);
      }
    });
  } catch(error) {
    panel.querySelector('.memory-list').textContent=
      'Could not load birthdays: '+error.message;
  }
}


// ======================================================
// AI FRIENDSHIP MEMORY DEMO — FIXED
// ======================================================

function showMemoryDemo() {
  const p=getProfile(state.active);
  const box=document.querySelector('.chat-compose');

  if(!box || !p || p.id!=='sam') return;

  const button=document.createElement('button');
  button.type='button';
  button.className='btn btn-outline btn-small';
  button.style.marginTop='12px';
  button.textContent='✧ Try AI Friendship Memory (demo)';
  box.appendChild(button);

  button.onclick=async()=>{
    
const friendMessages = (state.chats[p.id] || [])
  .filter(m => m.role === 'friend' && typeof m.text === 'string');

const sample = [...friendMessages].reverse()
  .find(m => /\bmy birthday\b/i.test(m.text))?.text;

if (!sample) {
  toast(`No birthday mentioned by ${p.name} in this chat yet.`);
  return;
}


    button.disabled=true;
    button.textContent='Gemma is checking…';

    try {
      
const saved = await getJson('/api/birthdays');

if (Object.prototype.hasOwnProperty.call(saved.birthdays || {}, p.name)) {
  toast(`${p.name}'s birthday is already saved. You can edit it in My Space.`);
  return;
}

      const {suggestion}=await postJson('/api/memory',{
        action:'suggest',
        profile_id:p.id,
        message:sample
      });

      if(!suggestion) {
        toast('No birthday found. Nothing was saved.');
        return;
      }

      
      dialog(`
        <h2>Possible friendship memory</h2>

        <p>
          In this fictional demo, ${esc(p.name)} said:
          “${esc(sample)}”
        </p>

        <p>
          Remember ${suggestion.day}/${suggestion.month}
          as ${esc(p.name)}'s birthday?
        </p>

        <div style="display:flex;gap:10px;margin-top:18px">
          <button type="button" class="btn btn-primary" id="memory-yes">
            Remember
          </button>

          <button type="button" class="btn btn-secondary" id="memory-no">
            Not now
          </button>
        </div>
      `);

      $('#memory-no').onclick=closeDialog;

      $('#memory-yes').onclick=async()=>{
        const yes=$('#memory-yes');
        yes.disabled=true;

        try {
          await postJson('/api/memory',{
            action:'remember',
            profile_id:p.id,
            month:suggestion.month,
            day:suggestion.day,
            consent:true
          });

          closeDialog();
          toast(`${p.name}'s birthday was saved.`);
        } catch(error) {
          yes.disabled=false;
          toast('Save failed: '+error.message);
        }
      };
    } catch(error) {
      toast('Memory check failed: '+error.message);
    } finally {
      if(button.isConnected) {
        button.disabled=false;
        button.textContent='✧ Try AI Friendship Memory (demo)';
      }
    }
  };
}


async function suggestFriendBirthday(id, message) {
  const friend = getProfile(id);

  if (!friend || state.view !== 'messages' || state.active !== id) {
    return;
  }

  try {
    const data = await getJson('/api/birthdays');

    if (Object.prototype.hasOwnProperty.call(
      data.birthdays || {}, friend.name
    )) {
      return;
    }

    const { suggestion } = await postJson('/api/memory', {
      action: 'suggest',
      profile_id: id,
      message
    });

    if (
      !suggestion ||
      state.view !== 'messages' ||
      state.active !== id
    ) {
      return;
    }

    dialog(`
      <h2>Possible friendship memory</h2>

      <p>${esc(friend.name)} said: “${esc(message)}”</p>

      <p>
        Remember ${suggestion.day}/${suggestion.month}
        as ${esc(friend.name)}'s birthday?
      </p>

      <p class="hint">
        Nothing is saved unless you choose Remember.
      </p>

      <div style="display:flex;gap:10px;margin-top:18px">
        <button type="button" class="btn btn-primary"
          id="auto-memory-yes">Remember</button>

        <button type="button" class="btn btn-secondary"
          id="auto-memory-no">Not now</button>
      </div>
    `);

    $('#auto-memory-no').onclick = closeDialog;

    $('#auto-memory-yes').onclick = async () => {
      const button = $('#auto-memory-yes');
      button.disabled = true;

      try {
        await postJson('/api/memory', {
          action: 'remember',
          profile_id: id,
          month: suggestion.month,
          day: suggestion.day,
          consent: true
        });

        closeDialog();
        toast(`${friend.name}'s birthday saved.`);

      } catch (error) {
        button.disabled = false;
        toast('Could not save memory: ' + error.message);
      }
    };

  } catch (error) {
    toast('Could not check memory: ' + error.message);
  }
}

