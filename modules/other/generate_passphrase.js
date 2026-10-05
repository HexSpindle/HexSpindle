import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const WORDS = ("abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid "
  + "acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice "
  + "aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien all "
  + "alley allow almost alone alpha already also alter always amateur amazing among amount amused analyst anchor ancient "
  + "anger angle angry animal ankle announce annual another answer antenna antique anxiety any apart apology appear apple "
  + "approve april arch arctic area arena argue arm armed armor army around arrange arrest arrive arrow art artist artwork "
  + "ask aspect assault asset assist assume asthma athlete atom attack attend attitude attract auction audit august aunt "
  + "author auto autumn average avocado avoid awake aware away awesome awful awkward axis bachelor bacon badge bag balance "
  + "balcony ball bamboo banana banner bar barely bargain barrel base basic basket battle beach bean beauty because become "
  + "beef before begin behave behind believe below belt bench benefit best betray better between beyond bicycle bid bike "
  + "bind biology bird birth bitter black blade blame blanket blast bleak bless blind blood blossom blouse blue blur blush "
  + "board boat body boil bomb bone bonus book boost border boring borrow boss bottom bounce box boy bracket brain brand "
  + "brass brave bread breeze brick bridge brief bright bring brisk broccoli broken bronze broom brother brown brush bubble "
  + "buddy budget buffalo build bulb bulk bullet bundle bunker burden burger burst bus business busy butter buyer buzz "
  + "cabbage cabin cable cactus cage cake call calm camera camp can canal cancel candy cannon canoe canvas canyon capable "
  + "capital captain car carbon card cargo carpet carry cart case cash casino castle casual cat catalog catch category "
  + "cattle caught cause caution cave ceiling celery cement census century cereal certain chair chalk champion change chaos "
  + "chapter charge chase chat cheap check cheese chef cherry chest chicken chief child chimney choice choose chronic chuckle "
  + "chunk churn cigar cinnamon circle citizen city civil claim clap clarify claw clay clean clerk clever click client cliff "
  + "climb clinic clip clock close cloth cloud clown club clump cluster clutch coach coast coconut code coffee coil coin "
  + "collect color column comic common company concert conduct confirm congress connect consider control convince cook "
  + "cool copper copy coral core corn correct cost cotton couch country couple course cousin cover coyote crack cradle craft "
  + "cram crane crash crater crawl crazy cream credit creek crew cricket crime crisp critic crop cross crouch crowd crucial "
  + "cruel cruise crumble crunch crush cry crystal cube culture cup cupboard curious current curtain curve cushion custom "
  + "cute cycle dad damage damp dance danger daring dash daughter dawn day deal debate debris decade december decide decline "
  + "decorate decrease deer defense define defy degree delay deliver demand demise denial dentist deny depart depend "
  + "deposit depth deputy derive describe desert design desk despair destroy detail detect develop device devote diagram "
  + "dial diamond diary dice diesel diet differ digital dignity dilemma dinner dinosaur direct dirt disagree discover "
  + "disease dish dismiss disorder display distance divert divide divorce dizzy doctor document dog doll dolphin domain "
  + "donate donkey donor door dose double dove draft dragon drama drastic draw dream dress drift drill drink drip drive "
  + "drop drum dry duck dumb dune during dust dutch duty dwarf dynamic").split(' ');

function randomInt(maxExclusive) {
  const limit = 0x100000000 - (0x100000000 % maxExclusive);
  let x;
  do { x = crypto.getRandomValues(new Uint32Array(1))[0]; } while (x >= limit);
  return x % maxExclusive;
}
function randomChoice(arr) { return arr[randomInt(arr.length)]; }

module('Generate Passphrase', 'Generates random word-based passphrases (Diceware-style). The input is ignored.',
  [A.number('Words', 5, 2, 20), A.string('Separator', '-'), A.boolean('Capitalise each word', false), A.boolean('Append a random digit', false), A.number('Count', 1, 1, 1000)],
  (data, n, sep, cap, digit, count) => {
    n = Math.trunc(n);
    const out = [];
    for (let c = 0; c < count; c++) {
      let words = Array.from({ length: n }, () => randomChoice(WORDS));
      if (cap) words = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      if (digit) words.push(String(randomInt(10)));
      out.push(words.join(sep));
    }
    const bits = n * Math.log2(WORDS.length);
    const note = `  (~${bits.toFixed(0)} bits of entropy per passphrase, ${WORDS.length}-word list)`;
    return out.join('\n') + (count ? '\n\n' + note.trim() : '');
  }, { text: true, nondeterministic: true });
