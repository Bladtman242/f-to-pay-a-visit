const DFA_ANY = {};
const dfa = {
  ANY: DFA_ANY,
  empty: () => {
    return {
      states: {},
    };
  },
  addTransition: (dfa, from, to, input, f) => {
    const _from = dfa.states[from] || { transitions: {} };
    const _to = dfa.states[to] || { transitions: {} };

    _from.transitions[input] = {to, f};

    dfa.states[from] = _from;
    dfa.states[to] = _to;
  },
  setState: (dfa, state) => {
    dfa.state = state;
    console.log(state);
  },
  input: (dfa, input) => {
    if(undefined === dfa.state){
      throw {
        msg:"dfa is not in a state, cannot transition",
        dfa,
        input,
      };
    }

    const state = dfa.states[dfa.state]

    if(undefined === state){
      throw {
        msg:"dfa does not have a state corresponding to its current state, cannot transition",
        dfa,
        input,
      };
    }

    let transition = state.transitions[input.event.key]
    if(transition === undefined) {
      transition = state.transitions[DFA_ANY];
      if(undefined !== transition){
        console.log('following the default transition');
      }
    }

    if(undefined === transition) {
      // no transition for this input, do nothing
      console.log('no transition for input', {dfa, input});
      return;
    }

    const { to, f } = transition;
    const stateOverride = f(input);
    dfa.state = stateOverride ?? to;
    console.log(dfa.state);
  },
}

const getNAncestors = (e, n) => {
  if (n === 0) {
    return [];
  } else {
    const parent = e.parentElement;
    if (!parent) {
      return [];
    } else {
      const ancestors = getNAncestors(parent, n - 1);
      ancestors.push(parent);
      return ancestors;
    }
  }
};

const getTargetableElements = () => {
  const isClickable =
    (e) => e.matches('a, summary, button, input, textarea, *[role="button"], *[onclick], *[contenteditable]')
        || window.getComputedStyle(e).cursor === 'pointer';

  const screenTop = 0
  const screenBottom = window.innerHeight;
  const isVisible = (e) => {
    const { top, bottom, width, height } = e.getBoundingClientRect();
    return top < screenBottom
        && screenTop < bottom
        && width >= 5
        && height >= 5;
  }

  const allElements = Array.from(document.getElementsByTagName('*'));
  const relevantElements = allElements.filter((e) => isVisible(e) && isClickable(e));

  const elementSet = new Set();
  relevantElements.forEach((e) => {
    const ancestors = getNAncestors(e, 5);
    const clickableAncestor = ancestors.find((a) => elementSet.has(a))
    if (clickableAncestor) {
      if (!(clickableAncestor.tagName === 'A' && clickableAncestor.href)) {
        elementSet.delete(clickableAncestor);
        elementSet.add(e);
      }
    } else {
      elementSet.add(e);
    }
  });
  return [...elementSet].map((e) => ({target: e}));
}

const zIndexOfElement = (e) => window.getComputedStyle(e).zIndex;

const findZIndex = (e) => {
  const zIndexOr0 = (e) => {
    const zi = zIndexOfElement(e);
    return zi !== 'auto' ? parseInt(zi) : 0;
  };

  const maxParent = (e) => {
    const zi = zIndexOr0(e);
    return e.parentElement ? Math.max(zi, maxParent(e.parentElement)) : zi;
  };

  const childrenZIndices = [...e.querySelectorAll('*')].map(zIndexOr0);
  return Math.max(...childrenZIndices, maxParent(e));
};

const generateTagElement = (tag) => {
  const tagElement = document.createElement('div');
  tagElement.className = 'tag';
  tagElement.style.top = `${tag.top}px`;
  tagElement.style.right =`${tag.right}px`;
  tagElement.style.zIndex = findZIndex(tag.target);
  tagElement.innerHTML = tag.name;
  tagElement.target = tag.target;
  tagElement.tagData = tag;
  return tagElement;
}

const positionTag = (element) => {
  const bbox = element.target.getBoundingClientRect();
  const top = bbox.top + window.scrollY;
  const right = window.innerWidth - (bbox.right + window.scrollX);
  return { top, right };
}

const positionTags = (elements) => {
  return elements.map((e) => {
    const pos = positionTag(e);
    return {
      ...pos,
      ...e,
    }
  });
}

const generateIdxes = (count, letters) => {
  const width = Math.max(1, Math.ceil(Math.log2(count) / Math.log2(letters.length)));
  const names = [];
  stack = [[0, ""]];
  let task = undefined;
  while(undefined !== (task = stack.shift())) {
    const [i, str] = task;
    for (const l of letters) {
      const nextStr = str + l;
      if(i === (width - 1)) {
        names.push(nextStr);
      } else {
          stack.push([i + 1, nextStr]);
      }
    }
  }
  return names
}

const euclideanDistance = (p1, p2) =>
  Math.sqrt(Math.abs(p1[0] - p2[0])**2 + Math.abs(p1[1] - p2[1]**2))

const nameTags = (tags) => {
  const letters = [
    "A", "S", "D", "F", "G",
    "Z", "X", "C", "V", "B",
    "Q", "W", "E", "R", "T",
  ];
  center = [window.innerWidth / 2, window.innerHeight / 2];
  tags.sort((t1,t2) => {
    const t1Rect = t1.target.getBoundingClientRect();
    const t2Rect = t2.target.getBoundingClientRect();
    t1DistanceToCenter = euclideanDistance([t1Rect.left, t1Rect.top], center);
    t2DistanceToCenter = euclideanDistance([t2Rect.left, t2Rect.top], center);
    return t1DistanceToCenter - t2DistanceToCenter;
  });
  const count = tags.length;
  const names = generateIdxes(count, letters);
  return tags.map((t,i) => ({ ...t, name: names[i] }));
}

let tagsInDom = [];
let filterString = "";
let yank = false;

const css =
`.tag {
  --color: #b28774;
  --background-color: #0d1321;
  --letter-spacing: 0.2ch;
  --horizontal-padding: 2px;
  --vertical-padding: 2px;

  position: absolute;
  display: inline;

  border: solid thin;
  border-radius: 3px;
  border-color: var(--color);
  outline: solid 2px var(--background-color);

  background-color: var(--background-color);
  color: var(--color);

  padding-left: calc(var(--horizontal-padding) + var(--letter-spacing));
  padding-right: var(--horizontal-padding);
  padding-top: var(--vertical-padding);
  padding-bottom: var(--vertical-padding);

  min-width: 2ch;

  font-weight: bold;
  font-size: 8pt;
  font-family: monospace;
  letter-spacing: var(--letter-spacing);
  text-align: center;
}
`;

// create shadow DOM
const shadowHost = document.createElement('div');
document.documentElement.appendChild(shadowHost);
const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

// create style element
const style = document.createElement('style');
style.appendChild(document.createTextNode(css));

// create holder element for tags
const holder = document.createElement('section');

// append style and holder elements to the shadow root
shadowRoot.appendChild(style);
shadowRoot.appendChild(holder);

const addTagElementsToDom = (elements) => {
  holder.append(...elements);
}

const displayTags = (tags) => {
  addTagElementsToDom(tags);
  tagsInDom = tags;
}

const hasModKey = (e) => {
  return e.ctrlKey
    || e.shiftKey
    || e.altKey
    || e.metaKey;
}

const isModKey = (e) => {
  return e.getModifierState(e.key);
}

const isContentEditable = (element) => {
  if (element === null || element === undefined || element === document) {
    return false;
  }
  const ceAttribute = element.getAttribute('contenteditable');
  const ce = ceAttribute === '' || ceAttribute === 'true';
  const par = element.parentElement;

  return ce || isContentEditable(par);
}

const inputTagNames = new Set(['INPUT', 'TEXTAREA']);
const isInputElement = (element) => inputTagNames.has(element.tagName) || isContentEditable(element);

//states
const YANK = "YANK";
const INACTIVE = "INACTIVE";
const ACTIVE = "ACTIVE"
const ESCAPED = "ESCAPED"

const stop = (e) => {
  e.event.stopImmediatePropagation();
  e.event.stopPropagation();
  e.event.preventDefault();
};

const activate = (i) => {
  if (hasModKey(i.event)) {
    return INACTIVE;
  } else {
    stop(i);
    display();
  }
};

 const deActivate = (i) => {
   stop(i);
   clear();
 };

const unfocus = (i) => { document.activeElement.blur() };

let timeoutId;

const delayTransition = (state) => (i) => {
  stop(i);
  timeoutId = setTimeout(() => {
    dfa.setState(stateMachine, state)
  }, 500);
};

const escaped = (i) => { clearTimeout(timeoutId) };

const filterInput = (i) => {
  stop(i);
  return filter(i.event);
};

stateMachine = dfa.empty();

dfa.addTransition(stateMachine, INACTIVE, YANK, 'y', delayTransition(INACTIVE));
dfa.addTransition(stateMachine, INACTIVE, ACTIVE, 'f', activate);
dfa.addTransition(stateMachine, INACTIVE, INACTIVE, 'Escape', unfocus);
dfa.addTransition(stateMachine, INACTIVE, ESCAPED, ',', delayTransition(INACTIVE));

dfa.addTransition(stateMachine, YANK, ESCAPED, ',', (i) => { escaped(i); delayTransition(INACTIVE)(i) });
dfa.addTransition(stateMachine, YANK, ACTIVE, 'f', (i) => { escaped(i); yank = true; return activate(i) });
dfa.addTransition(stateMachine, YANK, INACTIVE, dfa.ANY, escaped);

dfa.addTransition(stateMachine, ESCAPED, INACTIVE, dfa.ANY, escaped);

dfa.addTransition(stateMachine, ACTIVE, ACTIVE, dfa.ANY, filterInput);
dfa.addTransition(stateMachine, ACTIVE, INACTIVE, 'Escape', deActivate);

dfa.setState(stateMachine, INACTIVE);

const eventIsRelevant = (e) => {
  return !e.defaultPrevented
    && !isInputElement(e.target)
    && !isModKey(e);
}

const keypressHandler = (event) => {
  if (!eventIsRelevant(event)) {
    return;
  }
  dfa.input(stateMachine, { event });
};

const display = () => {
  let start = new Date();
  const targets = getTargetableElements();
  console.log(`found ${targets.length} targets in:`, new Date() - start);
  start = new Date();
  const namedTags = nameTags(targets);
  console.log(`named tags in`, new Date() - start);
  start = new Date();
  const positionedTags = positionTags(namedTags);
  console.log(`positioned tags in:`, new Date() - start);
  start = new Date();
  const tagElements = positionedTags.map(generateTagElement);
  console.log(`created tag elements in:`, new Date() - start);
  start = new Date();
  displayTags(tagElements);
  console.log(`added tag elements in:`, new Date() - start);
}

const clear = () => {
  tagsInDom.forEach(e => e.remove());
  tagsInDom = [];
  filterString = "";
  yank=false;
}

const displayIsActive = () => tagsInDom.length !== 0

const select = (tag, keyEvent) => {
  console.log('select', tag.target);

  if (yank) {
    console.log('we yankin\'');
      console.log('COPYING', tag.target);
    if (tag.target.tagName === 'A') {
      console.log('COPYING', tag.target.href);
      navigator.clipboard.writeText(tag.target.href);
    }
  } else {
    if(isInputElement(tag.target)) {
      tag.target.focus();
      tag.target.value = tag.target.value;
    }

    const modifiers = {
      shiftKey: keyEvent.shiftKey,
      ctrlKey: keyEvent.ctrlKey,
      altKey: keyEvent.altKey,
      metaKey: keyEvent.metaKey,
    };

    const Event = (type) => new MouseEvent(type, {
      bubbles: true,
      view: window,
      ... modifiers,
    });

    ['mouseover', 'mousedown', 'mouseup', 'click'].forEach((type) =>
      tag.target.dispatchEvent(Event(type)));
  }
  clear();
}

const partition = (arr, p) => {
  const not = (f) => (x) => !f(x);

  const yes = arr.filter(p);
  const no = arr.filter(not(p));

  return [yes, no];
}

const filter = (keyEvent) => {
  const key = keyEvent.key;
  if (key === 'Backspace') {
    filterString = filterString.slice(0,-1);
  } else {
    filterString += key.toUpperCase();
  }
  const [matches, rest] = partition(tagsInDom, (tag) => tag.tagData.name.startsWith(filterString));
  if (matches.length === 0) {
    clear();
    return INACTIVE;
  }
  if (matches.length === 1) {
    select(matches[0], keyEvent);
    return INACTIVE;
  }

  rest.forEach((tag) => tag.style.display = "none");

  matches.forEach((tag) => {
    tag.innerHTML = `<span style="opacity: 0.4">${filterString}</span>${tag.tagData.name.slice(filterString.length)}`;
    tag.style.display = '';
  });
}

window.addEventListener("keydown", keypressHandler, { capture: true });
