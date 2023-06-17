var DEBUG = false;

const originalLog = console.log;

console.log = (...args) =>
    DEBUG
    ? originalLog(...args)
    : undefined

const DFA = {
  ANY: { val: 'DFA_ANY' },
  empty: () => {
    return {
      states: {},
    };
  },
  addTransition: (dfa, from, to, input, f) => {
    f ??= () => {};

    const type =
      typeof input === 'object'
      ? input.type ?? DFA.ANY
      : DFA.ANY

    const value =
      typeof input === 'object'
      ? input.value ?? DFA.ANY
      : input;

    const _from = dfa.states[from] || { transitionTypes: new Map() };
    const _to = dfa.states[to] || { transitionTypes: new Map() };
    const fts = _from.transitionTypes;

    const transitions = fts.has(type) ? fts.get(type) : new Map();
    transitions.set(value, {to, f});
    fts.set(type, transitions);

    dfa.states[from] = _from;
    dfa.states[to] = _to;
  },
  setState: (dfa, state) => {
    dfa.state = state;
    console.log('setState', state);
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

    const type = state.transitionTypes.get(input.type)
              ?? state.transitionTypes.get(DFA.ANY);

    if(undefined === type) {
      // types means no transition for this input, do nothing
      return;
    }

    const transition = type.get(input.value) ?? type.get(DFA.ANY);

    if(undefined === transition) {
      // no transition for this input, do nothing
      return;
    }

    const { to, f } = transition;
    const stateOverride = f(input);

    const nextState = to ?? stateOverride;

    console.log("transitioning from", dfa.state, "to", nextState, "via", transition, "caused by input", input);

    dfa.state = stateOverride ?? to;
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

const getTargetableElements = (document = window.document) => {
  const isTargetable =
    yank
    ? (e) => e.matches('a[href]')
    : (e) => e.matches('a, summary, button, input, textarea, iframe, *[role="button"], *[onclick], *[contenteditable]')
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

  const isClickable = (e) => {
    const bbox = e.getBoundingClientRect();
    const x = bbox.left + bbox.width/2;
    const y = bbox.top + bbox.height/2;
    const elementFromPoint = document.elementFromPoint(x, y);
    if (e === elementFromPoint) {
      return true;
    } else if (elementFromPoint === null) {
      return false;
    } else {
      const ancestors = getNAncestors(elementFromPoint, 5);
      return ancestors.some((ancestor) => ancestor.contains(e));
    }
  }

  const allElements = Array.from(document.getElementsByTagName('*'));
  const relevantElements = allElements.filter((e) => isVisible(e) && isTargetable(e) && isClickable(e));

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

const generateTagElement = (tag) => {
  const tagElement = document.createElement('div');
  tagElement.className = 'tag';
  tagElement.style.top = `${tag.top}px`;
  tagElement.style.right =`${tag.right}px`;
  tagElement.innerHTML = tag.name;
  tagElement.target = tag.target;
  tagElement.tagData = tag;
  return tagElement;
}

var widths=[];
var rights=[];


const positionTag = (element) => {
  widths.push(document.body.clientWidth);
  const bbox = element.target.getBoundingClientRect();
  const top = bbox.top + window.scrollY;
  const right = -(bbox.right + window.scrollX);
  rights.push(right);
  return { top, right };
}

const positionTags = (elements) => {
  widths=[];
  const posd = elements.map((e) => {
    const pos = positionTag(e);
    return {
      ...pos,
      ...e,
    }
  });
  return posd;
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
shadowHost.style.display = 'block';
shadowHost.style.display = 'visible';
shadowHost.style.position = 'absolute';
shadowHost.style.width = '0px';
shadowHost.style.top = '0px';
shadowHost.style.left = '0px';
shadowHost.style.zIndex = '2147483647';

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

const isModKeyEvent = (e) => {
  return !!e.getModifierState?.(e?.key);
}

const cantBeContentEditable = new Set([null, undefined, document, window]);

const isContentEditable = (element) => {
  if (cantBeContentEditable.has(element)) {
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
const DISABLED = "DISABLED"

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

const unfocus = (i) => {
  document.activeElement.blur();
  if(document.activeElement.tagName === 'BODY') {
    window.blur();
    parent.focus();
  }
};

let timeoutId;

const delayTransition = (state) => (i) => {
  stop(i);
  timeoutId = setTimeout(() => {
    DFA.setState(stateMachine, state)
  }, 500);
};

const escaped = (i) => { clearTimeout(timeoutId) };

const filterInput = (i) => {
  stop(i);
  return filter(i.event);
};

stateMachine = DFA.empty();

DFA.addTransition(stateMachine, INACTIVE, YANK, 'y', delayTransition(INACTIVE));
DFA.addTransition(stateMachine, INACTIVE, ACTIVE, 'f', activate);
DFA.addTransition(stateMachine, INACTIVE, INACTIVE, 'Escape', unfocus);
DFA.addTransition(stateMachine, INACTIVE, ESCAPED, ',', delayTransition(INACTIVE));
DFA.addTransition(stateMachine, INACTIVE, DISABLED, { type: 'focusinput' });

DFA.addTransition(stateMachine, DISABLED, INACTIVE, { type: 'blur' });
DFA.addTransition(stateMachine, DISABLED, INACTIVE, 'Escape', unfocus);

DFA.addTransition(stateMachine, YANK, ESCAPED, ',', (i) => { escaped(i); delayTransition(INACTIVE)(i) });
DFA.addTransition(stateMachine, YANK, ACTIVE, 'f', (i) => { escaped(i); yank = true; return activate(i) });
DFA.addTransition(stateMachine, YANK, INACTIVE, DFA.ANY, escaped);

DFA.addTransition(stateMachine, ESCAPED, INACTIVE, DFA.ANY, escaped);

DFA.addTransition(stateMachine, ACTIVE, ACTIVE, { type: 'key' }, filterInput);
DFA.addTransition(stateMachine, ACTIVE, INACTIVE, { type: 'key', value: 'Escape' }, deActivate);
DFA.addTransition(stateMachine, ACTIVE, DISABLED, { type: 'focusinput' }, deActivate);

const initialState = isInputElement(document.activeElement)
                     ? DISABLED
                     : INACTIVE;

DFA.setState(stateMachine, initialState);

const inputOfEvent = (event) => {
  let type;
  if (event.type === 'focus' && isInputElement(event.target)) {
    type = 'focusinput';
  } else if (event.type === 'blur') {
    type = event.type;
  } else if (event.type === 'keydown') {
    type = 'key';
  } else {
    type = event.type;
  }

  let value;
  if (type === 'key') {
    value = event.key;
  }

  return { event, type, value };
}

const eventHandler = (event) => {
  if (isModKeyEvent(event)) {
    return;
  }
  DFA.input(stateMachine, inputOfEvent(event));
};

const display = () => {
  const start = new Date();
  let before = start;
  const targets = getTargetableElements();
  console.log(`found ${targets.length} targets in:`, new Date() - before);
  before = new Date();
  const namedTags = nameTags(targets);
  console.log(`named tags in`, new Date() - before);
  before = new Date();
  const positionedTags = positionTags(namedTags);
  console.log(`positioned tags in:`, new Date() - before);
  before = new Date();
  const tagElements = positionedTags.map(generateTagElement);
  console.log(`created tag elements in:`, new Date() - before);
  before = new Date();
  displayTags(tagElements);
  console.log(`added tag elements in:`, new Date() - before);
  console.log(`in total:`, new Date() - start);
}

const clear = () => {
  tagsInDom.forEach(e => e.remove());
  tagsInDom = [];
  filterString = "";
  yank=false;
}

const displayIsActive = () => tagsInDom.length !== 0

const queueOnEventLoop = (f) => setTimeout(f, 0);

const select = (tag, keyEvent) => {
  if (yank) {
    if (tag.target.tagName === 'A') {
      navigator.clipboard.writeText(tag.target.href);
    }
  } else {
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

    //necessary to let this process finish before the events are fired
    //dispatchEvent circuments the eventloop, it is blocking, and only returns
    //once the dispatched event has been handled.
    //For us, this means events will be processed _before_ we return to the state-machine.
    //This causes problems e.g. if the target is an input field, as selecting
    //it causes a focus event to fire, which will be handled as input to the
    //ACTIVE state, since we haven't returned from here yet, and therefore haven't returned to the INACTIVE state.
    //This means the focus event is given to filter as input, causing an exception.
    queueOnEventLoop(() => {
      // for some elements (iframes), dispacthing the click events doesn't do
      // the trick, but focusing does.
      // this is also necessary to activate (some?) input fields
      tag.target.focus();
      ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'].forEach((type) =>
        tag.target.dispatchEvent(Event(type)));
    });
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

window.addEventListener("keydown", eventHandler, { capture: true });
window.addEventListener("focus", eventHandler, { capture: true });
window.addEventListener("blur", eventHandler, { capture: true });
