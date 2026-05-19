const SPRITE_PATHS = {
  enemies: {
    martelo: { up: 'assets/enemies/martelo/up.png', down: 'assets/enemies/martelo/down.png', left: 'assets/enemies/martelo/left.png', right: 'assets/enemies/martelo/right.png' },
    furioso: { up: 'assets/enemies/furioso/up.png', down: 'assets/enemies/furioso/down.png', left: 'assets/enemies/furioso/left.png', right: 'assets/enemies/furioso/right.png' },
    machado: { up: 'assets/enemies/machado/up.png', down: 'assets/enemies/machado/down.png', left: 'assets/enemies/machado/left.png', right: 'assets/enemies/machado/right.png' },
  },
  towers: {
    archer:   { up: 'assets/towers/archer/up.png',   down: 'assets/towers/archer/down.png',   left: 'assets/towers/archer/left.png',   right: 'assets/towers/archer/right.png' },
    crossbow: { up: 'assets/towers/crossbow/up.png', down: 'assets/towers/crossbow/down.png', left: 'assets/towers/crossbow/left.png', right: 'assets/towers/crossbow/right.png' },
    catapult: { up: 'assets/towers/catapult/up.png', down: 'assets/towers/catapult/down.png', left: 'assets/towers/catapult/left.png', right: 'assets/towers/catapult/right.png' },
  },
  path: {
    straight_h: 'assets/path/straight_h.png',
    straight_v: 'assets/path/straight_v.png',
    corner_tl:  'assets/path/corner_tl.png',
    corner_tr:  'assets/path/corner_tr.png',
    corner_bl:  'assets/path/corner_bl.png',
    corner_br:  'assets/path/corner_br.png',
    t_up:       'assets/path/t_up.png',
    t_down:     'assets/path/t_down.png',
    t_left:     'assets/path/t_left.png',
    t_right:    'assets/path/t_right.png',
    cross:      'assets/path/cross.png',
  },
  slots: { slot: 'assets/slots/slot_stone.png' },
  decorations: {
    tree_pine: 'assets/decorations/tree_pine.png',
    tree_oak:  'assets/decorations/tree_oak.png',
    rock:      'assets/decorations/rock.png',
    sign:      'assets/decorations/sign.png',
    banner:    'assets/decorations/banner.png',
    fence:     'assets/decorations/fence.png',
    fire:      'assets/decorations/fire.png',
    stump:     'assets/decorations/stump.png',
    barrel:    'assets/decorations/barrel.png',
    crate:     'assets/decorations/crate.png',
    logs:      'assets/decorations/logs.png',
    bush:      'assets/decorations/bush.png',
  },
  castle: 'assets/castle.png',
  grass:  'assets/grass.png',
};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadGroup(group) {
  const out = {};
  for (const key of Object.keys(group)) {
    const val = group[key];
    if (typeof val === 'string') {
      out[key] = await loadImage(val);
    } else {
      out[key] = await loadGroup(val);
    }
  }
  return out;
}

export async function loadAssets() {
  return await loadGroup(SPRITE_PATHS);
}
