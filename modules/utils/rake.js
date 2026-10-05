import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const DEFAULT_STOPWORDS = "i,me,my,myself,we,our,ours,ourselves,you,you're,you've,you'll,you'd,your,yours,yourself,yourselves,he,him,his,himself,she,she's,her,hers,herself,it,it's,its,itsef,they,them,their,theirs,themselves,what,which,who,whom,this,that,that'll,these,those,am,is,are,was,were,be,been,being,have,has,had,having,do,does',did,doing,a,an,the,and,but,if,or,because,as,until,while,of,at,by,for,with,about,against,between,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,then,once,here,there,when,where,why,how,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,s,t,can,will,just,don,don't,should,should've,now,d,ll,m,o,re,ve,y,ain,aren,aren't,couldn,couldn't,didn,didn't,doesn,doesn't,hadn,hadn't,hasn,hasn't,haven,haven't,isn,isn't,ma,mightn,mightn't,mustn,mustn't,needn,needn't,shan,shan't,shouldn,shouldn't,wasn,wasn't,weren,weren't,won,won't,wouldn,wouldn't";

function unique(arr) {
  const seen = new Set(), out = [];
  for (const x of arr) {
    const k = Array.isArray(x) ? x.join('\u0001') : x;
    if (!seen.has(k)) { seen.add(k); out.push(x); }
  }
  return out;
}

module('RAKE', [
  'Rapid Automatic Keyword Extraction (Rose et al., 2010): splits the text into candidate keyword',
  'phrases by cutting on stop words and sentence boundaries, scores each distinct phrase by the',
  'degree/frequency ratio of its words\' co-occurrences, and lists phrases ranked highest-scoring first.',
  'Stop word list and scoring approach RAKE operation (itself based on the NLTK',
  'English stop words).',
].join(' '),
  [A.string('Word delimiter (regex)', '\\s'), A.string('Sentence delimiter (regex)', '\\.\\s|\\n'), A.area('Stop words', DEFAULT_STOPWORDS)],
  (text, wordDelimSrc, sentDelimSrc, stopWordsArg) => {
    const wordDelim = new RegExp(wordDelimSrc, 'g');
    const sentDelim = new RegExp(sentDelimSrc, 'g');
    const stopWords = unique(stopWordsArg.toLowerCase().replace(/ /g, '').split(','));
    stopWords.push('');

    const input = text.toLowerCase().trim();
    const tokens = [];
    const wordFrequencies = [];
    let phrases = [];

    for (const sent of input.split(sentDelim)) {
      const words = sent.split(wordDelim);
      let start = 0;
      for (let i = 0; i < words.length; i++) {
        const token = words[i];
        if (stopWords.includes(token)) {
          phrases.push(words.slice(start, i));
          start = i + 1;
        } else {
          const idx = tokens.indexOf(token);
          if (idx === -1) { tokens.push(token); wordFrequencies.push(1); } else wordFrequencies[idx]++;
        }
      }
      phrases.push(words.slice(start));
    }

    phrases = unique(phrases.filter(p => p.length > 0));

    const n = tokens.length;
    const wordDegreeMatrix = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const phrase of phrases) {
      const idxs = phrase.map(w => tokens.indexOf(w));
      for (const i1 of idxs) for (const i2 of idxs) wordDegreeMatrix[i1][i2]++;
    }

    const degreeScores = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let wordDegree = 0;
      for (let j = 0; j < n; j++) wordDegree += wordDegreeMatrix[j][i];
      degreeScores[i] = wordDegree / wordFrequencies[i];
    }

    const scored = phrases.map(phrase => {
      let score = 0;
      for (const w of phrase) score += degreeScores[tokens.indexOf(w)];
      return [score, phrase.join(' ')];
    });
    scored.sort((a, b) => b[0] - a[0]);

    const rows = [['Scores: ', 'Keywords: '], ...scored];
    return rows.map(r => r.join(', ')).join('\n');
  }, { text: true });
