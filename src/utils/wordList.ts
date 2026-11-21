import { PRNG } from './prng';
import { loadCustomThemes, getCustomThemeById } from './customThemes';

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  words: string[];
  words14?: string[];
  words18?: string[];
  words22?: string[];
  isCustom?: boolean;
}

export const THEMES: Record<string, ThemeDefinition> = {
  animals: {
    id: 'animals',
    name: 'Animals (Wildlife Kingdom)',
    description: 'Magnificent beasts, savanna runners, and marvelous creatures',
    words: [
      'ELEPHANT', 'GIRAFFE', 'KANGAROO', 'DOLPHIN', 'PENGUIN',
      'LEOPARD', 'CHEETAH', 'BUFFALO', 'SQUIRREL', 'HAMSTER',
      'RACCOON', 'OSTRICH', 'SEAHORSE', 'TORTOISE', 'CROCODILE',
      'FLAMINGO', 'HEDGEHOG', 'PLATYPUS', 'BUTTERFLY', 'OCTOPUS',
      'REINDEER', 'WOODPECKER', 'CHAMELEON', 'ARMADILLO', 'GORILLA',
      'MEERKAT', 'PANTHER', 'WALRUS', 'ZEBRA', 'KOALA',
      'BADGER', 'ANTELOPE', 'PELICAN', 'JAGUAR'
    ]
  },
  space: {
    id: 'space',
    name: 'Space & Cosmos',
    description: 'Planetary orbits, stellar nebulae, and interstellar voyages',
    words: [
      'PLANETS', 'ROCKETS', 'ASTRONAUT', 'SPACESHIP', 'GALAXIES',
      'METEORS', 'ECLIPSE', 'ASTEROID', 'UNIVERSE', 'MOONLIGHT',
      'STARLIGHT', 'SATELLITE', 'TELESCOPE', 'GRAVITY', 'LAUNCHPAD',
      'SPACEWALK', 'BLACKHOLE', 'CONSTELLATIONS', 'OBSERVATORY', 'SPACECRAFT',
      'WEIGHTLESS', 'EXPLORATION', 'SUPERNOVA', 'EXOPLANET', 'METEORITE',
      'INTERSTELLAR', 'NEBULA', 'QUASAR', 'SINGULARITY', 'COSMONAUT',
      'SOLARFLARE', 'ANDROMEDA'
    ]
  },
  dinosaurs: {
    id: 'dinosaurs',
    name: 'Dinosaurs & Prehistoric',
    description: 'Prehistoric behemoths, fossilized footprints, and apex predators',
    words: [
      'DINOSAUR', 'FOSSILS', 'TRICERATOPS', 'TYRANNOSAUR', 'VELOCIRAPTOR',
      'STEGOSAURUS', 'BRACHIOSAURUS', 'PTERODACTYL', 'PREHISTORIC', 'EXTINCTION',
      'SKELETON', 'FOOTPRINT', 'EXCAVATION', 'HERBIVORE', 'CARNIVORE',
      'OMNIVORE', 'VOLCANIC', 'RESEARCH', 'GIGANTIC', 'PREDATOR',
      'JURASSIC', 'RAPTORS', 'SPINOSAURUS', 'ANKYLOSAUR', 'PALEONTOLOGY',
      'MESOZOIC', 'CRETACEOUS', 'AMMONITE', 'MEGALODON', 'SAUROPOD',
      'AMBERSTONE'
    ]
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean & Deep Sea',
    description: 'Coral reefs, deep-sea tides, nautical shipwrecks, and sea life',
    words: [
      'OCEANIC', 'DOLPHIN', 'SEAHORSE', 'OCTOPUS', 'JELLYFISH',
      'STARFISH', 'CORALREEF', 'SHORELINE', 'AQUARIUM', 'SUBMARINE',
      'TREASURE', 'SEASHELL', 'CURRENTS', 'SUNLIGHT', 'LIGHTHOUSE',
      'MERMAIDS', 'SHIPWRECK', 'FISHERMAN', 'WHIRLPOOL', 'SAILBOAT',
      'UNDERWATER', 'SEASPRAY', 'BARRACUDA', 'MANTARAY', 'ANEMONE',
      'BARNACLE', 'KELPFOREST', 'STINGRAY', 'TIDEPOOL', 'NAUTILUS',
      'BIOLUMINESCENT'
    ]
  },
  cooking_food: {
    id: 'cooking_food',
    name: 'Cooking & Food',
    description: 'Kitchen creations, artisan recipes, delicious flavors, and treats',
    words: [
      'COOKING', 'KITCHEN', 'PANCAKE', 'NOODLES', 'SANDWICH',
      'CUPCAKE', 'POPCORN', 'SAUSAGE', 'BROCCOLI', 'SPINACH',
      'CARROTS', 'YOGHURT', 'DESSERT', 'RECIPES', 'STRAWBERRY',
      'CHOCOLATE', 'VANILLA', 'BREAKFAST', 'BLUEBERRY', 'CINNAMON',
      'MACARONI', 'DELICIOUS', 'GUACAMOLE', 'LASAGNA', 'SMOOTHIE',
      'CHEESECAKE', 'SOURDOUGH', 'ESPRESSO', 'SEASONING', 'BARBECUE',
      'WAFFLES', 'CARAMEL', 'MOZZARELLA'
    ]
  },
  sports: {
    id: 'sports',
    name: 'Sports & Athletics',
    description: 'Athletic arena showdowns, tournament medals, and stadium champions',
    words: [
      'FOOTBALL', 'CRICKET', 'SWIMMING', 'RUNNING', 'CYCLING',
      'HURDLES', 'ATHLETE', 'STADIUM', 'TRAINING', 'FITNESS',
      'GOLFING', 'SKATING', 'SURFING', 'JUMPING', 'BASEBALL',
      'VOLLEYBALL', 'GYMNASTICS', 'SCOREBOARD', 'COMPETITION', 'CHAMPIONS',
      'TOURNAMENT', 'MEDALIST', 'BASKETBALL', 'MARATHON', 'DECATHLON',
      'REFEREE', 'GOALKEEPER', 'BADMINTON', 'ARCHERY', 'WRESTLING',
      'TRIATHLON'
    ]
  },
  adventure_travel: {
    id: 'adventure_travel',
    name: 'Adventure & Travel',
    description: 'Backpacking expeditions, mountain trails, and global waypoints',
    words: [
      'ADVENTURE', 'JOURNEY', 'CAMPING', 'TREKKING', 'EXPLORING',
      'MOUNTAIN', 'WATERFALL', 'BACKPACK', 'PASSPORT', 'HOLIDAY',
      'TRAVELS', 'SUITCASE', 'COMPASS', 'CAMPSITE', 'AIRPLANE',
      'RAILWAY', 'COASTLINE', 'DISCOVERY', 'LUGGAGE', 'CROSSING',
      'SKYLINE', 'DESTINATION', 'EXPEDITION', 'WANDERLUST', 'NAVIGATOR',
      'WAYPOINT', 'SUMMIT', 'CAMPFIRE', 'CANYON', 'WILDERNESS',
      'SAFARI', 'POSTCARD'
    ]
  },
  magic_fantasy: {
    id: 'magic_fantasy',
    name: 'Magic & Fantasy',
    description: 'Enchanted kingdoms, spellbooks, mythical dragons, and wizardry',
    words: [
      'MAGICAL', 'DRAGONS', 'UNICORN', 'WIZARDS', 'CASTLES',
      'POTIONS', 'FAIRIES', 'KINGDOM', 'MERMAID', 'SPARKLE',
      'MYSTERY', 'ENCHANTED', 'TREASURE', 'SPELLBOOK', 'GOBLINS',
      'PRINCESS', 'ADVENTURE', 'MOONLIGHT', 'RAINBOW', 'STARDUST',
      'SORCERY', 'IMAGINARY', 'ALCHEMIST', 'GRIMOIRE', 'WEREWOLF',
      'WARLOCKS', 'PHOENIX', 'SORCERER', 'AMULET', 'PROPHECY',
      'TALISMAN', 'SPELLBOUND'
    ]
  },
  science_technology: {
    id: 'science_technology',
    name: 'Science & Technology',
    description: 'Laboratories, quantum circuits, robotics, and breakthrough inventions',
    words: [
      'SCIENCE', 'CHEMISTRY', 'BIOLOGY', 'GEOLOGY', 'PHYSICS',
      'COMPUTER', 'ROBOTICS', 'PROGRAMMING', 'INTERNET', 'CIRCUIT',
      'BATTERY', 'MICROSCOPE', 'LABORATORY', 'INVENTION', 'ELECTRICITY',
      'EXPERIMENT', 'DISCOVERY', 'TECHNOLOGY', 'ENGINEERS', 'SOFTWARE',
      'HARDWARE', 'SATELLITE', 'QUANTUM', 'CYBERNETICS', 'ARTIFICIAL',
      'ALGORITHM', 'GENOMICS', 'MOLECULE', 'NANOTECH', 'PROCESSOR',
      'ELECTRON'
    ]
  },
  nature_gardening: {
    id: 'nature_gardening',
    name: 'Nature & Gardening',
    description: 'Blooming blossoms, woodland greenery, meadows, and greenhouse crops',
    words: [
      'GARDENS', 'FLOWERS', 'SUNLIGHT', 'RAINBOW', 'FORESTS',
      'MEADOWS', 'MOUNTAIN', 'WATERFALL', 'BUTTERFLY', 'BIRDSONG',
      'SEEDLING', 'BLOSSOM', 'GARDENER', 'WILDLIFE', 'SUNFLOWER',
      'GREENERY', 'RAINFALL', 'WOODLAND', 'COMPOSTING', 'WATERING',
      'POTATOES', 'TOMATOES', 'BOTANICAL', 'GREENHOUSE', 'LAVENDER',
      'ORCHARD', 'POLLINATION', 'HYDRANGEA', 'MARIGOLD', 'FERTILE',
      'DRAGONFLY', 'TERRARIUM'
    ]
  },
  aussie_slang: {
    id: 'aussie_slang',
    name: 'True Blue Outback',
    description: 'Classic Aussie vernacular, creatures, and bush essentials',
    words: [
      'BILLABONG', 'PLATYPUS', 'DIDGERIDOO', 'KOOKABURRA', 'OUTBACK',
      'BOOMERANG', 'KANGAROO', 'FAIRDINKUM', 'SWAGMAN', 'BARBIE',
      'SUNBURNT', 'CORROBOREE', 'WALLABY', 'BUSHWALKER', 'COCKATOO',
      'SHEEPDOG', 'BUSHFIRE', 'JACKAROO', 'TINNY', 'CRIKEY',
      'BONZA', 'RIPPER', 'ESKY', 'THONG', 'GDAY'
    ]
  },
  cryptids: {
    id: 'cryptids',
    name: 'Cryptids & Lore',
    description: 'Unsolved legends, elusive shadows, and wilderness folklore',
    words: [
      'SASQUATCH', 'CHUPACABRA', 'MOTHMAN', 'LOCHNESS', 'YETI',
      'WENDIGO', 'JACKALOPE', 'JERSEYDEVIL', 'THUNDERBIRD', 'SKUNKAPE',
      'FLATWOODS', 'BUNYIP', 'MOKELE', 'SHADOWPERSON', 'FOOTPRINT',
      'HAUNTING', 'LEGEND', 'MYSTERY', 'FOLKLORE', 'SIGHTING',
      'HOAX', 'BEAST', 'NOCTURNAL', 'WILDMAN'
    ]
  },
  pirates: {
    id: 'pirates',
    name: 'High Seas Buccaneers',
    description: 'Black sails, hidden treasure, cutlasses, and ocean plunder',
    words: [
      'BUCCANEER', 'BROADSIDE', 'GALLEON', 'TREASURE', 'CROSSBONES',
      'CORSAIR', 'CUTLASS', 'DOUBLOONS', 'QUARTERDECK', 'MUTINY',
      'MAROONED', 'PLUNDER', 'PRIVATEER', 'SCALLYWAG', 'SCURVY',
      'SEADOG', 'SHIPWRECK', 'SKULLFLAG', 'SWASHBUCKLE', 'CROWSNEST',
      'ANCHOR', 'CANNON', 'COMPASS', 'ISLAND', 'PARROT'
    ]
  },
  retro_arcade: {
    id: 'retro_arcade',
    name: '80s Arcade Blast',
    description: 'Quarter munchers, pixel art, and golden age video games',
    words: [
      'JOYSTICK', 'HIGHSCORE', 'LEADERBOARD', 'PIXELART', 'GAMEOVER',
      'EXTRALIFE', 'POWERUP', 'CARTRIDGE', 'INVADERS', 'PACMAN',
      'CENTIPEDE', 'DEFENDER', 'ASTEROIDS', 'TRACKBALL', 'CHIPTUNE',
      'CHECKPOINT', 'PLATFORMER', 'CONTINUE', 'RESPAWN', 'SPEEDRUN',
      'BONUSSTAGE', 'COINOP', 'VECTOR', 'BLASTER', 'ARCADE'
    ]
  },
  detective_noir: {
    id: 'detective_noir',
    name: 'Noir Mystery',
    description: 'Rain-slicked cobblestones, shadowy interrogations, and unsolved crimes',
    words: [
      'INVESTIGATION', 'FINGERPRINTS', 'INTERROGATE', 'SURVEILLANCE', 'TESTIMONY',
      'ALIBICHECK', 'DETECTIVE', 'TRENCHCOAT', 'MAGNIFIER', 'REVOLVER',
      'BLACKMAIL', 'CONSPIRACY', 'EVIDENCE', 'CORONER', 'HANDCUFFS',
      'SUSPECT', 'INFORMANT', 'SHADOWS', 'MYSTERY', 'WITNESS',
      'BADGE', 'FEDORA', 'CLUES', 'MOTIVE', 'ALIBI'
    ]
  },
  coffee_culture: {
    id: 'coffee_culture',
    name: 'Artisan Cafe',
    description: 'Roast profiles, espresso extraction, barista craft, and morning warmth',
    words: [
      'CAPPUCCINO', 'MACCHIATO', 'AMERICANO', 'AEROPRESS', 'DECAFFEINATED',
      'ESPRESSO', 'COLDBREW', 'CHEMEX', 'EXTRACTION', 'POUROVER',
      'ARABICA', 'ROBUSTA', 'FROTHED', 'BARISTA', 'GRINDER',
      'CREMA', 'ROASTED', 'ROASTERY', 'TAMPER', 'CARAMEL',
      'STEAMER', 'CAFE', 'BEANS', 'DRIP', 'LATTE'
    ]
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Matrix',
    description: 'High tech, low life, neural nets and dystopian streets',
    words: [
      'CYBERSPACE', 'NEURALNET', 'SYNTHWAVE', 'BIOMETRICS', 'HOLOGRAM',
      'AUGMENTED', 'NANOBOT', 'FIREWALL', 'CRYPTOGRAPHY', 'CYBORG',
      'NEONPULSE', 'MAINFRAME', 'OVERCLOCK', 'ALGORITHM', 'MEGACORP',
      'GLITCH', 'SUBNET', 'TERMINAL', 'CIRCUIT', 'QUANTUM',
      'DATABANK', 'HEADJACK', 'INTERPOL', 'BACKDOOR', 'ZERODAY'
    ]
  },
  medieval_castles: {
    id: 'medieval_castles',
    name: 'Feudal Stronghold',
    description: 'Fortified parapets, chivalric knights, siege towers, and royal courts',
    words: [
      'PORTCULLIS', 'DRAWBRIDGE', 'BATTLEMENT', 'TREBUCHET', 'STRONGHOLD',
      'CATAPULT', 'FORTRESS', 'CATAPHRACT', 'BASTION', 'PARAPET',
      'CHIVALRY', 'BALLISTA', 'DUNGEON', 'BARBICAN', 'HERALDRY',
      'CROSSBOW', 'ARMOR', 'KNIGHT', 'SHIELD', 'RAMPART',
      'TURRET', 'MOAT', 'SIEGE', 'LANCE', 'KEEP'
    ]
  }
};

// 600+ General words for "Completely Random / Chaos Mode"
export const CHAOS_DICTIONARY = [
  'ABSOLUTE', 'ABSTRACT', 'ACADEMIC', 'ACIDIC', 'ACOUSTIC', 'ACTION', 'ACTIVITY', 'ADAPT',
  'ADMIRE', 'ADVENTURE', 'ADVOCATE', 'AERODYNAMIC', 'AESTHETIC', 'AFFINITY', 'ALARM', 'ALCHEMY',
  'ALGEBRA', 'ALLIANCE', 'ALMANAC', 'ALPINE', 'AMBITION', 'AMULET', 'ANALYST', 'ANATOMY',
  'ANCHOR', 'ANECDOTE', 'ANGULAR', 'ANIMATION', 'ANTARCTIC', 'ANTIQUE', 'APERTURE', 'APPETITE',
  'AQUARIUM', 'ARCADE', 'ARCHAEOLOGY', 'ARCHIPELAGO', 'ARCTIC', 'ARENA', 'ARMAMENT', 'ARTERY',
  'ARTIFACT', 'ARTILLERY', 'ASCEND', 'ASPECT', 'ASPHALT', 'ASSEMBLY', 'ASTEROID', 'ASTRONOMY',
  'ATHLETIC', 'ATLAS', 'ATMOSPHERE', 'ATOM', 'ATTACH', 'ATTIC', 'AUCTION', 'AURORA',
  'AUTHENTIC', 'AVALANCHE', 'AVENUE', 'AVIATION', 'AZIMUTH', 'BACKBONE', 'BADGE', 'BALANCE',
  'BALCONY', 'BALLISTIC', 'BAMBOO', 'BANDIT', 'BANQUET', 'BAROMETER', 'BARRICADE', 'BARRIER',
  'BASTION', 'BATTERY', 'BATTLE', 'BEACON', 'BEARING', 'BEDROCK', 'BELLIGERENT', 'BENCHMARK',
  'BERRY', 'BICYCLE', 'BIFOCAL', 'BILLION', 'BINOCULARS', 'BIOMETRIC', 'BIOSPHERE', 'BIRCH',
  'BISMUTH', 'BLIZZARD', 'BLOCKADE', 'BLUEPRINT', 'BOULDER', 'BOUNDARY', 'BRACKET', 'BRANCH',
  'BRASS', 'BREEZE', 'BRIGADE', 'BRISTLE', 'BRONZE', 'BROWSER', 'BUBBLE', 'BUCKET',
  'BUFFALO', 'BULLET', 'BUNKER', 'BUOYANT', 'CABIN', 'CABLE', 'CACTUS', 'CADENCE',
  'CALCULATOR', 'CALDERA', 'CALENDAR', 'CALIBRATION', 'CAMEL', 'CAMERA', 'CAMOUFLAGE', 'CAMPFIRE',
  'CANOPY', 'CANYON', 'CAPACITOR', 'CAPSULE', 'CAPTAIN', 'CAPTURE', 'CARBIDE', 'CARBON',
  'CARGO', 'CARNIVAL', 'CASCADE', 'CASTLE', 'CATALYST', 'CATAPULT', 'CAVERN', 'CEILING',
  'CELERITY', 'CELLULAR', 'CEMENT', 'CENTURY', 'CERAMIC', 'CHALLENGE', 'CHAMBER', 'CHAMPION',
  'CHARCOAL', 'CHARIOT', 'CHEMICAL', 'CHIMERA', 'CHISEL', 'CHRONICLE', 'CIRCUIT', 'CIRCULAR',
  'CITADEL', 'CLIMATE', 'CLINICAL', 'CLUSTER', 'COBALT', 'COCOON', 'COGNITIVE', 'COHESION',
  'COLLAPSE', 'COLLIDER', 'COLONY', 'COLOSSAL', 'COLUMN', 'COMBAT', 'COMET', 'COMMAND',
  'COMPASS', 'COMPLEX', 'COMPOUND', 'COMPUTE', 'CONCAVE', 'CONCERT', 'CONCRETE', 'CONDUCTOR',
  'CONDUIT', 'CONFERENCE', 'CONIFER', 'CONQUER', 'CONSTELLATION', 'CONSUMER', 'CONTAINER', 'CONTINENT',
  'CONTOUR', 'CONVERT', 'COPPER', 'CORRIDOR', 'COSMIC', 'COURIER', 'CRATER', 'CREATIVE',
  'CREEK', 'CRESCENT', 'CRICKET', 'CRIMSON', 'CRITICAL', 'CROSSBOW', 'CRUISER', 'CRUST',
  'CRYSTAL', 'CUBICLE', 'CULMINATE', 'CURRENT', 'CUSTODY', 'CYLINDER', 'DAGGER', 'DATABASE',
  'DAYLIGHT', 'DECIBEL', 'DECIMAL', 'DECIPHER', 'DEFENSE', 'DELIVERY', 'DELTA', 'DENSITY',
  'DEPOSIT', 'DESERT', 'DESTINY', 'DETECTOR', 'DETONATE', 'DIAGRAM', 'DIAMOND', 'DIARY',
  'DIFFUSION', 'DIGITAL', 'DILEMMA', 'DIMENSION', 'DIPLOMAT', 'DIRECTOR', 'DISCOVERY', 'DISPATCH',
  'DISTANCE', 'DISTRICT', 'DIVIDEND', 'DOLPHIN', 'DOMINANT', 'DORMANT', 'DRAGON', 'DRAINAGE',
  'DYNAMIC', 'ECLIPSE', 'ECOLOGY', 'ECONOMIC', 'ECOSYSTEM', 'EDITION', 'EFFORT', 'ELASTIC',
  'ELECTRIC', 'ELECTRON', 'ELEGANT', 'ELEMENT', 'ELEVATION', 'ELIXIR', 'EMERALD', 'EMISSION',
  'EMPIRE', 'ENCRYPTION', 'ENDURANCE', 'ENGINE', 'ENGRAVE', 'ENTERPRISE', 'EPICENTER', 'EQUATOR',
  'EQUILIBRIUM', 'EROSION', 'ERUPTION', 'ESCALATE', 'ESTUARY', 'ETHERNET', 'EVALUATE', 'EVAPORATE',
  'EVEREST', 'EVOLUTION', 'EXCAVATE', 'EXCURSION', 'EXECUTE', 'EXHAUST', 'EXPEDITION', 'EXPERIMENT',
  'EXPLORE', 'EXPLOSION', 'EXPONENT', 'EXTREME', 'FACTOR', 'FACULTY', 'FAHRENHEIT', 'FALCON',
  'FANTASTIC', 'FASTEN', 'FEATURE', 'FERMENT', 'FERRIS', 'FIBER', 'FIELD', 'FILAMENT',
  'FILTER', 'FINANCE', 'FIREFLY', 'FIREWALL', 'FISSION', 'FJORD', 'FLASHLIGHT', 'FLIGHT',
  'FLOATING', 'FLUORIDE', 'FOCAL', 'FOLKLORE', 'FORECAST', 'FORENSIC', 'FOREST', 'FORGE',
  'FORTITUDE', 'FORTRESS', 'FOSSIL', 'FOUNDRY', 'FRACTAL', 'FRAGMENT', 'FREQUENCY', 'FRICTION',
  'FRONTIER', 'FROST', 'FUEL', 'FURNACE', 'FUSION', 'FUTURE', 'GALAXY', 'GALLERY',
  'GALVANIZE', 'GARNET', 'GASOLINE', 'GAUNTLET', 'GEARBOX', 'GENERATOR', 'GENETIC', 'GEOLOGY',
  'GEOMETRY', 'GEYSER', 'GLACIER', 'GLASSHOUSE', 'GLIDER', 'GLUCOSE', 'GOLDEN', 'GRADIENT',
  'GRANITE', 'GRAPHITE', 'GRAVITY', 'GRIDIRON', 'HABITAT', 'HALOGEN', 'HAMMER', 'HARBOR',
  'HARDWARE', 'HARMONY', 'HARVEST', 'HAZARD', 'HEADLIGHT', 'HELICOPTER', 'HELIX', 'HELMET',
  'HEMISPHERE', 'HERITAGE', 'HEXAGON', 'HIBERNATE', 'HIGHLAND', 'HIGHWAY', 'HOLOGRAPH', 'HORIZON',
  'HUMIDITY', 'HYDRAULIC', 'HYDROGEN', 'HYPERION', 'ICEBERG', 'IGNITION', 'ILLUSION', 'IMMUNITY',
  'IMPACT', 'IMPULSE', 'INCIDENT', 'INCUBATOR', 'INDEX', 'INDUSTRY', 'INFINITY', 'INSPECTION',
  'INTEGRAL', 'INTERCEPT', 'INTERVAL', 'INVENTOR', 'ISLAND', 'ISOTOPE', 'JAGUAR', 'JAVELIN',
  'JOURNEY', 'JUNCTION', 'JUNGLE', 'JUPITER', 'KINETIC', 'KNIGHT', 'KRYPTON', 'LABORATORY',
  'LABYRINTH', 'LADDER', 'LAGOON', 'LASER', 'LATITUDE', 'LAUNCH', 'LAVA', 'LEGEND',
  'LEOPARD', 'LIGHTHOUSE', 'LIGHTNING', 'LIMESTONE', 'LITHIUM', 'LOCKER', 'LOCOMOTIVE', 'LOGARITHM',
  'LOGIC', 'LONGITUDE', 'LUCID', 'LUMBER', 'LUNAR', 'MACHINERY', 'MAGMA', 'MAGNESIUM',
  'MAGNETIC', 'MAJESTIC', 'MAMMAL', 'MANEUVER', 'MANTLE', 'MARATHON', 'MARINER', 'MATRIX',
  'MAXIMUM', 'MECHANISM', 'MEGAPHONE', 'MERCURY', 'MERIDIAN', 'METALLIC', 'METEOR', 'MICROBE',
  'MICROSCOPE', 'MIGRATION', 'MILLENNIUM', 'MINERAL', 'MIRACLE', 'MISSILE', 'MISSION', 'MOMENTUM',
  'MONARCH', 'MONOLITH', 'MONSOON', 'MONUMENT', 'MORTAR', 'MOUNTAIN', 'MUSEUM', 'MUTATION',
  'MYSTERY', 'NANOMETER', 'NARRATIVE', 'NATURAL', 'NAVIGATOR', 'NEBULA', 'NEEDLE', 'NETWORK',
  'NEUTRON', 'NICKEL', 'NIGHTFALL', 'NITROGEN', 'NOMAD', 'NORTHERN', 'NUCLEAR', 'NUCLEUS',
  'OASIS', 'OBSERVATORY', 'OBSTACLE', 'OCCURRENCE', 'OCEANIC', 'OCTAGON', 'ODYSSEY', 'OFFSHORE',
  'OMEGA', 'OPERATOR', 'OPPOSITE', 'OPTICAL', 'ORBIT', 'ORCHESTRA', 'ORGANIC', 'ORIGIN',
  'OUTLET', 'OUTPOST', 'OVERDRIVE', 'OXYGEN', 'OZONE', 'PACIFIC', 'PALETTE', 'PANORAMA',
  'PARACHUTE', 'PARADOX', 'PARALLEL', 'PARTICLE', 'PASSAGE', 'PATHWAY', 'PATROL', 'PATTERNS',
  'PAVILION', 'PENDULUM', 'PENINSULA', 'PERILOUS', 'PERIODIC', 'PERSPECTIVE', 'PHANTOM', 'PHOSPHOR',
  'PHYSICAL', 'PINNACLE', 'PIONEER', 'PIPELINE', 'PISTON', 'PIVOT', 'PLANETARY', 'PLASMA',
  'PLATFORM', 'PLATINUM', 'PLUTONIUM', 'POLAR', 'POLYMER', 'POPULATION', 'PORTABLE', 'POTASSIUM',
  'POTENTIAL', 'POWERFUL', 'PRECISION', 'PRESSURE', 'PRIMARY', 'PRIMITIVE', 'PRISM', 'PROBE',
  'PROFILE', 'PROJECTOR', 'PROPULSION', 'PROTOCOL', 'PROTOTYPE', 'PULSE', 'PUPIL', 'PYRAMID',
  'QUANTUM', 'QUARRY', 'QUARTER', 'QUASAR', 'RADAR', 'RADIANT', 'RADIATION', 'RADICAL',
  'REACTOR', 'REACTION', 'RECEPTOR', 'RECORD', 'RECTANGLE', 'REDWOOD', 'REFINERY', 'REFLECT',
  'REFRIGERATE', 'REGION', 'REGULATOR', 'REINFORCE', 'RELIABLE', 'RELIC', 'REMOTE', 'RENEWABLE',
  'RESERVE', 'RESERVOIR', 'RESIDUAL', 'RESONANCE', 'RESOURCE', 'RETINA', 'REVOLUTION', 'RICOCHET',
  'ROBOTIC', 'ROCKET', 'ROLLER', 'ROTATION', 'ROUTINE', 'RUNWAY', 'SATELLITE', 'SAVANNA',
  'SCISSORS', 'SCORPION', 'SCOUT', 'SECRET', 'SECTION', 'SECURITY', 'SEDIMENT', 'SECTOR',
  'SEISMIC', 'SELECTIVE', 'SEMAPHORE', 'SEQUENCE', 'SERPENT', 'SHADOW', 'SHEILD', 'SHIPYARD',
  'SIGNAL', 'SILICON', 'SILVER', 'SIMULATION', 'SIREN', 'SKELETON', 'SOLAR', 'SOLUTION',
  'SOLVENT', 'SOUNDPROOF', 'SOVEREIGN', 'SPARK', 'SPECTRAL', 'SPECTRUM', 'SPEEDWAY', 'SPHERE',
  'SPIRAL', 'STABILITY', 'STADIUM', 'STALACTITE', 'STALAGMITE', 'STAINLESS', 'STANDARD', 'STARLIGHT',
  'STATIC', 'STATION', 'STEALTH', 'STEAM', 'STEEL', 'STELLAR', 'STIMULUS', 'STORAGE',
  'STORM', 'STRATEGY', 'STRATOSPHERE', 'STRUCTURE', 'SUBMARINE', 'SULFUR', 'SUMMIT', 'SUNFLOWER',
  'SUPERSONIC', 'SUPPLY', 'SURFACE', 'SURGEON', 'SURROUND', 'SURVIVAL', 'SUSPENSION', 'SWITCH',
  'SYMMETRY', 'SYNAPSE', 'SYNCHRONOUS', 'SYSTEM', 'TACTICAL', 'TELESCOPE', 'TEMPERATURE', 'TERMINAL',
  'TERRAIN', 'TEXTURE', 'THERMAL', 'THUNDER', 'TITANIUM', 'TORRENT', 'TRAJECTORY', 'TRANSFORM',
  'TRANSMIT', 'TREASURE', 'TREMOR', 'TRIANGLE', 'TRIGGER', 'TROPHY', 'TSUNAMI', 'TURBINE',
  'ULTIMATE', 'ULTRAVIOLET', 'UMBRELLA', 'UNDERGROUND', 'UNIVERSE', 'URANIUM', 'VALLEY', 'VALVE',
  'VAPOR', 'VARIABLE', 'VECTOR', 'VEHICLE', 'VELOCITY', 'VENTILATE', 'VESSEL', 'VIBRATION',
  'VICINITY', 'VICTORY', 'VILLAGE', 'VIRTUAL', 'VISCOSITY', 'VISIBLE', 'VISION', 'VITALITY',
  'VOLCANO', 'VOLTAGE', 'VORTEX', 'VOYAGE', 'WARRIOR', 'WATERPROOF', 'WAVELENGTH', 'WEATHER',
  'WEIGHT', 'WHISPER', 'WILDLIFE', 'WINDMILL', 'WIRELESS', 'WONDER', 'ZEPHYR', 'ZINC', 'ZODIAC'
];

export function getWordCountForGridSize(size: number): number {
  switch (size) {
    case 16: return 14;
    case 18: return 18;
    case 20: return 22;
    default: return 15;
  }
}

export function getAllThemes(): Record<string, ThemeDefinition> {
  const merged: Record<string, ThemeDefinition> = { ...THEMES };
  const custom = loadCustomThemes();
  for (const c of custom) {
    merged[c.id] = {
      id: c.id,
      name: c.name,
      description: c.description,
      words: c.words,
      words14: c.words14,
      words18: c.words18,
      words22: c.words22,
      isCustom: true
    };
  }
  return merged;
}

export function generatePuzzleTheme(
  seed: number,
  isChaosMode: boolean = false,
  requestedThemeId?: string,
  gridSize?: number,
  customWordsOverride?: string[]
): {
  themeId: string;
  name: string;
  description: string;
  words: string[];
} {
  const prng = new PRNG(seed);
  
  if (isChaosMode || requestedThemeId === 'chaos') {
    const shuffled = prng.shuffle(CHAOS_DICTIONARY);
    const selected = shuffled.slice(0, 30);
    return {
      themeId: 'chaos',
      name: 'Total Chaos (Random Words)',
      description: 'Unpredictable cross-genre random vocabulary test',
      words: selected
    };
  }

  // If explicit custom words override was passed (e.g. from GameRound.customWords)
  if (customWordsOverride && customWordsOverride.length > 0) {
    const customTheme = requestedThemeId ? getCustomThemeById(requestedThemeId) : undefined;
    return {
      themeId: requestedThemeId || 'custom',
      name: customTheme?.name || 'Custom Topic',
      description: customTheme?.description || 'Custom crafted word list',
      words: prng.shuffle([...customWordsOverride])
    };
  }

  const allThemes = getAllThemes();
  const themeKeys = Object.keys(allThemes);
  const selectedThemeKey = (requestedThemeId && allThemes[requestedThemeId])
    ? requestedThemeId
    : themeKeys[prng.nextInt(0, themeKeys.length - 1)];
  const theme = allThemes[selectedThemeKey] || THEMES.animals;
  
  // Pick specific tiered list if available for this grid size
  let candidateWords = theme.words;
  if (gridSize === 16 && theme.words14 && theme.words14.length >= 14) {
    candidateWords = theme.words14;
  } else if (gridSize === 18 && theme.words18 && theme.words18.length >= 18) {
    candidateWords = theme.words18;
  } else if (gridSize === 20 && theme.words22 && theme.words22.length >= 22) {
    candidateWords = theme.words22;
  }

  // Deterministically shuffle theme words
  const shuffledWords = prng.shuffle(candidateWords);

  return {
    themeId: theme.id,
    name: theme.name,
    description: theme.description,
    words: shuffledWords
  };
}

export function getAvailableThemes(): {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
  wordCounts?: { w14: number; w18: number; w22: number };
}[] {
  const allThemes = getAllThemes();
  return Object.values(allThemes).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    isCustom: Boolean(t.isCustom),
    wordCounts: (t.words14?.length || t.words18?.length || t.words22?.length) ? {
      w14: t.words14?.length || 0,
      w18: t.words18?.length || 0,
      w22: t.words22?.length || 0
    } : undefined
  }));
}

// Generate weekly puzzle based on current year and ISO week
export function getWeeklyCompetitionSeed(): { seed: number; weekLabel: string } {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
  const year = now.getFullYear();
  
  // Unique integer seed for the week
  const weekSeed = year * 100 + weekNumber;
  return {
    seed: weekSeed,
    weekLabel: `Week ${weekNumber}, ${year}`
  };
}
