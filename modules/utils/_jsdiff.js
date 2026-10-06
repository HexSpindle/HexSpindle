// Vendored jsdiff 9.0.0 (BSD-3-Clause, Copyright (c) 2009-2015 Kevin Decker). String diffs only.
// ---- util/string.js
export function longestCommonPrefix(str1, str2) {
    let i;
    for (i = 0; i < str1.length && i < str2.length; i++) {
        if (str1[i] != str2[i]) {
            return str1.slice(0, i);
        }
    }
    return str1.slice(0, i);
}
export function longestCommonSuffix(str1, str2) {
    let i;
    // Unlike longestCommonPrefix, we need a special case to handle all scenarios
    // where we return the empty string since str1.slice(-0) will return the
    // entire string.
    if (!str1 || !str2 || str1[str1.length - 1] != str2[str2.length - 1]) {
        return '';
    }
    for (i = 0; i < str1.length && i < str2.length; i++) {
        if (str1[str1.length - (i + 1)] != str2[str2.length - (i + 1)]) {
            return str1.slice(-i);
        }
    }
    return str1.slice(-i);
}
export function replacePrefix(string, oldPrefix, newPrefix) {
    if (string.slice(0, oldPrefix.length) != oldPrefix) {
        throw Error(`string ${JSON.stringify(string)} doesn't start with prefix ${JSON.stringify(oldPrefix)}; this is a bug`);
    }
    return newPrefix + string.slice(oldPrefix.length);
}
export function replaceSuffix(string, oldSuffix, newSuffix) {
    if (!oldSuffix) {
        return string + newSuffix;
    }
    if (string.slice(-oldSuffix.length) != oldSuffix) {
        throw Error(`string ${JSON.stringify(string)} doesn't end with suffix ${JSON.stringify(oldSuffix)}; this is a bug`);
    }
    return string.slice(0, -oldSuffix.length) + newSuffix;
}
export function removePrefix(string, oldPrefix) {
    return replacePrefix(string, oldPrefix, '');
}
export function removeSuffix(string, oldSuffix) {
    return replaceSuffix(string, oldSuffix, '');
}
export function maximumOverlap(string1, string2) {
    return string2.slice(0, overlapCount(string1, string2));
}
// Nicked from https://stackoverflow.com/a/60422853/1709587
function overlapCount(a, b) {
    // Deal with cases where the strings differ in length
    let startA = 0;
    if (a.length > b.length) {
        startA = a.length - b.length;
    }
    let endB = b.length;
    if (a.length < b.length) {
        endB = a.length;
    }
    // Create a back-reference for each index
    //   that should be followed in case of a mismatch.
    //   We only need B to make these references:
    const map = Array(endB);
    let k = 0; // Index that lags behind j
    map[0] = 0;
    for (let j = 1; j < endB; j++) {
        if (b[j] == b[k]) {
            map[j] = map[k]; // skip over the same character (optional optimisation)
        }
        else {
            map[j] = k;
        }
        while (k > 0 && b[j] != b[k]) {
            k = map[k];
        }
        if (b[j] == b[k]) {
            k++;
        }
    }
    // Phase 2: use these references while iterating over A
    k = 0;
    for (let i = startA; i < a.length; i++) {
        while (k > 0 && a[i] != b[k]) {
            k = map[k];
        }
        if (a[i] == b[k]) {
            k++;
        }
    }
    return k;
}
/**
 * Returns true if the string consistently uses Windows line endings.
 */
export function hasOnlyWinLineEndings(string) {
    return string.includes('\r\n') && !string.startsWith('\n') && !string.match(/[^\r]\n/);
}
/**
 * Returns true if the string consistently uses Unix line endings.
 */
export function hasOnlyUnixLineEndings(string) {
    return !string.includes('\r\n') && string.includes('\n');
}
/**
 * Split a string into segments using a word segmenter, merging consecutive
 * segments if they are both whitespace segments. Whitespace segments can
 * appear adjacent to one another for two reasons:
 * - newlines always get their own segment
 * - where a diacritic is attached to a whitespace character in the text, the
 *   segment ends after the diacritic, so e.g. " \u0300 " becomes two segments.
 * This function therefore runs the segmenter's .segment() method and then
 * merges consecutive segments of whitespace into a single part.
 */
export function segment(string, segmenter) {
    const parts = [];
    for (const segmentObj of Array.from(segmenter.segment(string))) {
        const segment = segmentObj.segment;
        if (parts.length && (/\s/).test(parts[parts.length - 1]) && (/\s/).test(segment)) {
            parts[parts.length - 1] += segment;
        }
        else {
            parts.push(segment);
        }
    }
    return parts;
}
// The functions below take a `segmenter` argument so that, when called from
// diffWords when it is using a segmenter, they can use a notion of what
// constitutes "whitespace" that is consistent with the segmenter.
//
// USUALLY this will be identical to the result of the non-segmenter-based
// logic, but it differs in at least one case: when whitespace characters are
// modified by diacritics. A word segmenter considers these diacritics to be
// part of the whitespace, whereas our non-segmenter-based logic does not.
//
// Because the segmenter-based approach necessarily requires segmenting the
// entire string, we offer a leadingAndTrailingWs function to allow getting the
// whitespace prefix AND whitespace suffix with a single call to the segmenter,
// for efficiency's sake.
export function trailingWs(string, segmenter) {
    if (segmenter) {
        return leadingAndTrailingWs(string, segmenter)[1];
    }
    // Yes, this looks overcomplicated and dumb - why not replace the whole function with
    //     return string.match(/\s*$/)[0]
    // you ask? Because:
    // 1. the trap described at https://markamery.com/blog/quadratic-time-regexes/ would mean doing
    //    this would cause this function to take O(n²) time in the worst case (specifically when
    //    there is a massive run of NON-TRAILING whitespace in `string`), and
    // 2. the fix proposed in the same blog post, of using a negative lookbehind, is incompatible
    //    with old Safari versions that we'd like to not break if possible (see
    //    https://github.com/kpdecker/jsdiff/pull/550)
    // It feels absurd to do this with an explicit loop instead of a regex, but I really can't see a
    // better way that doesn't result in broken behaviour.
    let i;
    for (i = string.length - 1; i >= 0; i--) {
        if (!string[i].match(/\s/)) {
            break;
        }
    }
    return string.substring(i + 1);
}
export function leadingWs(string, segmenter) {
    if (segmenter) {
        return leadingAndTrailingWs(string, segmenter)[0];
    }
    // Thankfully the annoying considerations described in trailingWs don't apply here:
    const match = string.match(/^\s*/);
    return match ? match[0] : '';
}
export function leadingAndTrailingWs(string, segmenter) {
    if (!segmenter) {
        return [leadingWs(string), trailingWs(string)];
    }
    if (segmenter.resolvedOptions().granularity != 'word') {
        throw new Error('The segmenter passed must have a granularity of "word"');
    }
    const segments = segment(string, segmenter);
    const firstSeg = segments[0];
    const lastSeg = segments[segments.length - 1];
    const head = (/\s/).test(firstSeg) ? firstSeg : '';
    const tail = (/\s/).test(lastSeg) ? lastSeg : '';
    return [head, tail];
}

// ---- util/params.js
export function generateOptions(options, defaults) {
    if (typeof options === 'function') {
        defaults.callback = options;
    }
    else if (options) {
        for (const name in options) {
            /* istanbul ignore else */
            if (Object.prototype.hasOwnProperty.call(options, name)) {
                defaults[name] = options[name];
            }
        }
    }
    return defaults;
}

// ---- diff/base.js
class Diff {
    diff(oldStr, newStr, 
    // Type below is not accurate/complete - see above for full possibilities - but it compiles
    options = {}) {
        let callback;
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        else if ('callback' in options) {
            callback = options.callback;
        }
        // Allow subclasses to massage the input prior to running
        const oldString = this.castInput(oldStr, options);
        const newString = this.castInput(newStr, options);
        const oldTokens = this.removeEmpty(this.tokenize(oldString, options));
        const newTokens = this.removeEmpty(this.tokenize(newString, options));
        return this.diffWithOptionsObj(oldTokens, newTokens, options, callback);
    }
    diffWithOptionsObj(oldTokens, newTokens, options, callback) {
        var _a;
        const done = (value) => {
            value = this.postProcess(value, options);
            if (callback) {
                setTimeout(function () { callback(value); }, 0);
                return undefined;
            }
            else {
                return value;
            }
        };
        const newLen = newTokens.length, oldLen = oldTokens.length;
        let editLength = 1;
        let maxEditLength = newLen + oldLen;
        if (options.maxEditLength != null) {
            maxEditLength = Math.min(maxEditLength, options.maxEditLength);
        }
        const maxExecutionTime = (_a = options.timeout) !== null && _a !== void 0 ? _a : Infinity;
        const abortAfterTimestamp = Date.now() + maxExecutionTime;
        const bestPath = [{ oldPos: -1, lastComponent: undefined }];
        // Seed editLength = 0, i.e. the content starts with the same values
        let newPos = this.extractCommon(bestPath[0], newTokens, oldTokens, 0, options);
        if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
            // Identity per the equality and tokenizer
            return done(this.buildValues(bestPath[0].lastComponent, newTokens, oldTokens));
        }
        // Once we hit the right edge of the edit graph on some diagonal k, we can
        // definitely reach the end of the edit graph in no more than k edits, so
        // there's no point in considering any moves to diagonal k+1 any more (from
        // which we're guaranteed to need at least k+1 more edits).
        // Similarly, once we've reached the bottom of the edit graph, there's no
        // point considering moves to lower diagonals.
        // We record this fact by setting minDiagonalToConsider and
        // maxDiagonalToConsider to some finite value once we've hit the edge of
        // the edit graph.
        // This optimization is not faithful to the original algorithm presented in
        // Myers's paper, which instead pointlessly extends D-paths off the end of
        // the edit graph - see page 7 of Myers's paper which notes this point
        // explicitly and illustrates it with a diagram. This has major performance
        // implications for some common scenarios. For instance, to compute a diff
        // where the new text simply appends d characters on the end of the
        // original text of length n, the true Myers algorithm will take O(n+d^2)
        // time while this optimization needs only O(n+d) time.
        let minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
        // Main worker method. checks all permutations of a given edit length for acceptance.
        const execEditLength = () => {
            for (let diagonalPath = Math.max(minDiagonalToConsider, -editLength); diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
                let basePath;
                const removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
                if (removePath) {
                    // No one else is going to attempt to use this value, clear it
                    // @ts-expect-error - perf optimisation. This type-violating value will never be read.
                    bestPath[diagonalPath - 1] = undefined;
                }
                let canAdd = false;
                if (addPath) {
                    // what newPos will be after we do an insertion:
                    const addPathNewPos = addPath.oldPos - diagonalPath;
                    canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
                }
                const canRemove = removePath && removePath.oldPos + 1 < oldLen;
                if (!canAdd && !canRemove) {
                    // If this path is a terminal then prune
                    // @ts-expect-error - perf optimisation. This type-violating value will never be read.
                    bestPath[diagonalPath] = undefined;
                    continue;
                }
                // Select the diagonal that we want to branch from. We select the prior
                // path whose position in the old string is the farthest from the origin
                // and does not pass the bounds of the diff graph
                if (!canRemove || (canAdd && removePath.oldPos < addPath.oldPos)) {
                    basePath = this.addToPath(addPath, true, false, 0, options);
                }
                else {
                    basePath = this.addToPath(removePath, false, true, 1, options);
                }
                newPos = this.extractCommon(basePath, newTokens, oldTokens, diagonalPath, options);
                if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
                    // If we have hit the end of both strings, then we are done
                    return done(this.buildValues(basePath.lastComponent, newTokens, oldTokens)) || true;
                }
                else {
                    bestPath[diagonalPath] = basePath;
                    if (basePath.oldPos + 1 >= oldLen) {
                        maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
                    }
                    if (newPos + 1 >= newLen) {
                        minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
                    }
                }
            }
            editLength++;
        };
        // Performs the length of edit iteration. Is a bit fugly as this has to support the
        // sync and async mode which is never fun. Loops over execEditLength until a value
        // is produced, or until the edit length exceeds options.maxEditLength (if given),
        // in which case it will return undefined.
        if (callback) {
            (function exec() {
                setTimeout(function () {
                    if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
                        return callback(undefined);
                    }
                    if (!execEditLength()) {
                        exec();
                    }
                }, 0);
            }());
        }
        else {
            while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
                const ret = execEditLength();
                if (ret) {
                    return ret;
                }
            }
        }
    }
    addToPath(path, added, removed, oldPosInc, options) {
        const last = path.lastComponent;
        if (last && !options.oneChangePerToken && last.added === added && last.removed === removed) {
            return {
                oldPos: path.oldPos + oldPosInc,
                lastComponent: { count: last.count + 1, added: added, removed: removed, previousComponent: last.previousComponent }
            };
        }
        else {
            return {
                oldPos: path.oldPos + oldPosInc,
                lastComponent: { count: 1, added: added, removed: removed, previousComponent: last }
            };
        }
    }
    extractCommon(basePath, newTokens, oldTokens, diagonalPath, options) {
        const newLen = newTokens.length, oldLen = oldTokens.length;
        let oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
        while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(oldTokens[oldPos + 1], newTokens[newPos + 1], options)) {
            newPos++;
            oldPos++;
            commonCount++;
            if (options.oneChangePerToken) {
                basePath.lastComponent = { count: 1, previousComponent: basePath.lastComponent, added: false, removed: false };
            }
        }
        if (commonCount && !options.oneChangePerToken) {
            basePath.lastComponent = { count: commonCount, previousComponent: basePath.lastComponent, added: false, removed: false };
        }
        basePath.oldPos = oldPos;
        return newPos;
    }
    equals(left, right, options) {
        if (options.comparator) {
            return options.comparator(left, right);
        }
        else {
            return left === right
                || (!!options.ignoreCase && left.toLowerCase() === right.toLowerCase());
        }
    }
    removeEmpty(array) {
        const ret = [];
        for (let i = 0; i < array.length; i++) {
            if (array[i]) {
                ret.push(array[i]);
            }
        }
        return ret;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    castInput(value, options) {
        return value;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tokenize(value, options) {
        return Array.from(value);
    }
    join(chars) {
        // Assumes ValueT is string, which is the case for most subclasses.
        // When it's false, e.g. in diffArrays, this method needs to be overridden (e.g. with a no-op)
        // Yes, the casts are verbose and ugly, because this pattern - of having the base class SORT OF
        // assume tokens and values are strings, but not completely - is weird and janky.
        return chars.join('');
    }
    postProcess(changeObjects, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options) {
        return changeObjects;
    }
    get useLongestToken() {
        return false;
    }
    buildValues(lastComponent, newTokens, oldTokens) {
        // First we convert our linked list of components in reverse order to an
        // array in the right order:
        const components = [];
        let nextComponent;
        while (lastComponent) {
            components.push(lastComponent);
            nextComponent = lastComponent.previousComponent;
            delete lastComponent.previousComponent;
            lastComponent = nextComponent;
        }
        components.reverse();
        const componentLen = components.length;
        let componentPos = 0, newPos = 0, oldPos = 0;
        for (; componentPos < componentLen; componentPos++) {
            const component = components[componentPos];
            if (!component.removed) {
                if (!component.added && this.useLongestToken) {
                    let value = newTokens.slice(newPos, newPos + component.count);
                    value = value.map(function (value, i) {
                        const oldValue = oldTokens[oldPos + i];
                        return oldValue.length > value.length ? oldValue : value;
                    });
                    component.value = this.join(value);
                }
                else {
                    component.value = this.join(newTokens.slice(newPos, newPos + component.count));
                }
                newPos += component.count;
                // Common case
                if (!component.added) {
                    oldPos += component.count;
                }
            }
            else {
                component.value = this.join(oldTokens.slice(oldPos, oldPos + component.count));
                oldPos += component.count;
            }
        }
        return components;
    }
}

// ---- diff/character.js
class CharacterDiff extends Diff {
}
export const characterDiff = new CharacterDiff();
export function diffChars(oldStr, newStr, options) {
    return characterDiff.diff(oldStr, newStr, options);
}

// ---- diff/word.js
// Based on https://en.wikipedia.org/wiki/Latin_script_in_Unicode
//
// Chars/ranges counted as "word" characters by this regex are as follows:
//
// + U+00AD  Soft hyphen
// + 00C0–00FF (letters with diacritics from the Latin-1 Supplement), except:
//   - U+00D7  × Multiplication sign
//   - U+00F7  ÷ Division sign
// + Latin Extended-A, 0100–017F
// + Latin Extended-B, 0180–024F
// + IPA Extensions, 0250–02AF
// + Spacing Modifier Letters, 02B0–02FF, except:
//   - U+02C7  ˇ &#711;  Caron
//   - U+02D8  ˘ &#728;  Breve
//   - U+02D9  ˙ &#729;  Dot Above
//   - U+02DA  ˚ &#730;  Ring Above
//   - U+02DB  ˛ &#731;  Ogonek
//   - U+02DC  ˜ &#732;  Small Tilde
//   - U+02DD  ˝ &#733;  Double Acute Accent
// + Latin Extended Additional, 1E00–1EFF
const extendedWordChars = 'a-zA-Z0-9_\\u{AD}\\u{C0}-\\u{D6}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}';
// Each token is one of the following:
// - A punctuation mark plus the surrounding whitespace
// - A word plus the surrounding whitespace
// - Pure whitespace (but only in the special case where the entire text
//   is just whitespace)
//
// We have to include surrounding whitespace in the tokens because the two
// alternative approaches produce horribly broken results:
// * If we just discard the whitespace, we can't fully reproduce the original
//   text from the sequence of tokens and any attempt to render the diff will
//   get the whitespace wrong.
// * If we have separate tokens for whitespace, then in a typical text every
//   second token will be a single space character. But this often results in
//   the optimal diff between two texts being a perverse one that preserves
//   the spaces between words but deletes and reinserts actual common words.
//   See https://github.com/kpdecker/jsdiff/issues/160#issuecomment-1866099640
//   for an example.
//
// Keeping the surrounding whitespace of course has implications for .equals
// and .join, not just .tokenize.
// This regex does NOT fully implement the tokenization rules described above.
// Instead, it gives runs of whitespace their own "token". The tokenize method
// then handles stitching whitespace tokens onto adjacent word or punctuation
// tokens.
const tokenizeIncludingWhitespace = new RegExp(`[${extendedWordChars}]+|\\s+|[^${extendedWordChars}]`, 'ug');
class WordDiff extends Diff {
    equals(left, right, options) {
        if (options.ignoreCase) {
            left = left.toLowerCase();
            right = right.toLowerCase();
        }
        return left.trim() === right.trim();
    }
    tokenize(value, options = {}) {
        let parts;
        if (options.intlSegmenter) {
            const segmenter = options.intlSegmenter;
            if (segmenter.resolvedOptions().granularity != 'word') {
                throw new Error('The segmenter passed must have a granularity of "word"');
            }
            // We want `parts` to be an array whose elements alternate between being
            // pure whitespace and being pure non-whitespace. This is ALMOST what the
            // segments returned by a word-based Intl.Segmenter already look like,
            // but not quite - see explanation in the docs of our custom segment()
            // function.
            parts = segment(value, segmenter);
        }
        else {
            parts = value.match(tokenizeIncludingWhitespace) || [];
        }
        const tokens = [];
        let prevPart = null;
        parts.forEach(part => {
            if ((/\s/).test(part)) {
                if (prevPart == null) {
                    tokens.push(part);
                }
                else {
                    tokens.push(tokens.pop() + part);
                }
            }
            else if (prevPart != null && (/\s/).test(prevPart)) {
                if (tokens[tokens.length - 1] == prevPart) {
                    tokens.push(tokens.pop() + part);
                }
                else {
                    tokens.push(prevPart + part);
                }
            }
            else {
                tokens.push(part);
            }
            prevPart = part;
        });
        return tokens;
    }
    join(tokens) {
        // Tokens being joined here will always have appeared consecutively in the
        // same text, so we can simply strip off the leading whitespace from all the
        // tokens except the first (and except any whitespace-only tokens - but such
        // a token will always be the first and only token anyway) and then join them
        // and the whitespace around words and punctuation will end up correct.
        return tokens.map((token, i) => {
            if (i == 0) {
                return token;
            }
            else {
                return token.replace((/^\s+/), '');
            }
        }).join('');
    }
    postProcess(changes, options) {
        if (!changes || options.oneChangePerToken) {
            return changes;
        }
        let lastKeep = null;
        // Change objects representing any insertion or deletion since the last
        // "keep" change object. There can be at most one of each.
        let insertion = null;
        let deletion = null;
        changes.forEach(change => {
            if (change.added) {
                insertion = change;
            }
            else if (change.removed) {
                deletion = change;
            }
            else {
                if (insertion || deletion) { // May be false at start of text
                    dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, change, options.intlSegmenter);
                }
                lastKeep = change;
                insertion = null;
                deletion = null;
            }
        });
        if (insertion || deletion) {
            dedupeWhitespaceInChangeObjects(lastKeep, deletion, insertion, null, options.intlSegmenter);
        }
        return changes;
    }
}
export const wordDiff = new WordDiff();
export function diffWords(oldStr, newStr, options) {
    // This option has never been documented and never will be (it's clearer to
    // just call `diffWordsWithSpace` directly if you need that behavior), but
    // has existed in jsdiff for a long time, so we retain support for it here
    // for the sake of backwards compatibility.
    if ((options === null || options === void 0 ? void 0 : options.ignoreWhitespace) != null && !options.ignoreWhitespace) {
        return diffWordsWithSpace(oldStr, newStr, options);
    }
    return wordDiff.diff(oldStr, newStr, options);
}
function dedupeWhitespaceInChangeObjects(startKeep, deletion, insertion, endKeep, segmenter) {
    // Before returning, we tidy up the leading and trailing whitespace of the
    // change objects to eliminate cases where trailing whitespace in one object
    // is repeated as leading whitespace in the next.
    // Below are examples of the outcomes we want here to explain the code.
    // I=insert, K=keep, D=delete
    // 1. diffing 'foo bar baz' vs 'foo baz'
    //    Prior to cleanup, we have K:'foo ' D:' bar ' K:' baz'
    //    After cleanup, we want:   K:'foo ' D:'bar ' K:'baz'
    //
    // 2. Diffing 'foo bar baz' vs 'foo qux baz'
    //    Prior to cleanup, we have K:'foo ' D:' bar ' I:' qux ' K:' baz'
    //    After cleanup, we want K:'foo ' D:'bar' I:'qux' K:' baz'
    //
    // 3. Diffing 'foo\nbar baz' vs 'foo baz'
    //    Prior to cleanup, we have K:'foo ' D:'\nbar ' K:' baz'
    //    After cleanup, we want K'foo' D:'\nbar' K:' baz'
    //
    // 4. Diffing 'foo baz' vs 'foo\nbar baz'
    //    Prior to cleanup, we have K:'foo\n' I:'\nbar ' K:' baz'
    //    After cleanup, we ideally want K'foo' I:'\nbar' K:' baz'
    //    but don't actually manage this currently (the pre-cleanup change
    //    objects don't contain enough information to make it possible).
    //
    // 5. Diffing 'foo   bar baz' vs 'foo  baz'
    //    Prior to cleanup, we have K:'foo  ' D:'   bar ' K:'  baz'
    //    After cleanup, we want K:'foo  ' D:' bar ' K:'baz'
    //
    // Our handling is unavoidably imperfect in the case where there's a single
    // indel between keeps and the whitespace has changed. For instance, consider
    // diffing 'foo\tbar\nbaz' vs 'foo baz'. Unless we create an extra change
    // object to represent the insertion of the space character (which isn't even
    // a token), we have no way to avoid losing information about the texts'
    // original whitespace in the result we return. Still, we do our best to
    // output something that will look sensible if we e.g. print it with
    // insertions in green and deletions in red.
    // Between two "keep" change objects (or before the first or after the last
    // change object), we can have either:
    // * A "delete" followed by an "insert"
    // * Just an "insert"
    // * Just a "delete"
    // We handle the three cases separately.
    if (deletion && insertion) {
        const [oldWsPrefix, oldWsSuffix] = leadingAndTrailingWs(deletion.value, segmenter);
        const [newWsPrefix, newWsSuffix] = leadingAndTrailingWs(insertion.value, segmenter);
        if (startKeep) {
            const commonWsPrefix = longestCommonPrefix(oldWsPrefix, newWsPrefix);
            startKeep.value = replaceSuffix(startKeep.value, newWsPrefix, commonWsPrefix);
            deletion.value = removePrefix(deletion.value, commonWsPrefix);
            insertion.value = removePrefix(insertion.value, commonWsPrefix);
        }
        if (endKeep) {
            const commonWsSuffix = longestCommonSuffix(oldWsSuffix, newWsSuffix);
            endKeep.value = replacePrefix(endKeep.value, newWsSuffix, commonWsSuffix);
            deletion.value = removeSuffix(deletion.value, commonWsSuffix);
            insertion.value = removeSuffix(insertion.value, commonWsSuffix);
        }
    }
    else if (insertion) {
        // The whitespaces all reflect what was in the new text rather than
        // the old, so we essentially have no information about whitespace
        // insertion or deletion. We just want to dedupe the whitespace.
        // We do that by having each change object keep its trailing
        // whitespace and deleting duplicate leading whitespace where
        // present.
        if (startKeep) {
            const ws = leadingWs(insertion.value, segmenter);
            insertion.value = insertion.value.substring(ws.length);
        }
        if (endKeep) {
            const ws = leadingWs(endKeep.value, segmenter);
            endKeep.value = endKeep.value.substring(ws.length);
        }
        // otherwise we've got a deletion and no insertion
    }
    else if (startKeep && endKeep) {
        const newWsFull = leadingWs(endKeep.value, segmenter), [delWsStart, delWsEnd] = leadingAndTrailingWs(deletion.value, segmenter);
        // Any whitespace that comes straight after startKeep in both the old and
        // new texts, assign to startKeep and remove from the deletion.
        const newWsStart = longestCommonPrefix(newWsFull, delWsStart);
        deletion.value = removePrefix(deletion.value, newWsStart);
        // Any whitespace that comes straight before endKeep in both the old and
        // new texts, and hasn't already been assigned to startKeep, assign to
        // endKeep and remove from the deletion.
        const newWsEnd = longestCommonSuffix(removePrefix(newWsFull, newWsStart), delWsEnd);
        deletion.value = removeSuffix(deletion.value, newWsEnd);
        endKeep.value = replacePrefix(endKeep.value, newWsFull, newWsEnd);
        // If there's any whitespace from the new text that HASN'T already been
        // assigned, assign it to the start:
        startKeep.value = replaceSuffix(startKeep.value, newWsFull, newWsFull.slice(0, newWsFull.length - newWsEnd.length));
    }
    else if (endKeep) {
        // We are at the start of the text. Preserve all the whitespace on
        // endKeep, and just remove whitespace from the end of deletion to the
        // extent that it overlaps with the start of endKeep.
        const endKeepWsPrefix = leadingWs(endKeep.value, segmenter);
        const deletionWsSuffix = trailingWs(deletion.value, segmenter);
        const overlap = maximumOverlap(deletionWsSuffix, endKeepWsPrefix);
        deletion.value = removeSuffix(deletion.value, overlap);
    }
    else if (startKeep) {
        // We are at the END of the text. Preserve all the whitespace on
        // startKeep, and just remove whitespace from the start of deletion to
        // the extent that it overlaps with the end of startKeep.
        const startKeepWsSuffix = trailingWs(startKeep.value, segmenter);
        const deletionWsPrefix = leadingWs(deletion.value, segmenter);
        const overlap = maximumOverlap(startKeepWsSuffix, deletionWsPrefix);
        deletion.value = removePrefix(deletion.value, overlap);
    }
}
class WordsWithSpaceDiff extends Diff {
    tokenize(value) {
        // Slightly different to the tokenizeIncludingWhitespace regex used above in
        // that this one treats each individual newline as a distinct token, rather
        // than merging them into other surrounding whitespace. This was requested
        // in https://github.com/kpdecker/jsdiff/issues/180 &
        //    https://github.com/kpdecker/jsdiff/issues/211
        const regex = new RegExp(`(\\r?\\n)|[${extendedWordChars}]+|[^\\S\\n\\r]+|[^${extendedWordChars}]`, 'ug');
        return value.match(regex) || [];
    }
}
export const wordsWithSpaceDiff = new WordsWithSpaceDiff();
export function diffWordsWithSpace(oldStr, newStr, options) {
    return wordsWithSpaceDiff.diff(oldStr, newStr, options);
}

// ---- diff/line.js
class LineDiff extends Diff {
    constructor() {
        super(...arguments);
        this.tokenize = tokenize;
    }
    equals(left, right, options) {
        // If we're ignoring whitespace, we need to normalise lines by stripping
        // whitespace before checking equality. (This has an annoying interaction
        // with newlineIsToken that requires special handling: if newlines get their
        // own token, then we DON'T want to trim the *newline* tokens down to empty
        // strings, since this would cause us to treat whitespace-only line content
        // as equal to a separator between lines, which would be weird and
        // inconsistent with the documented behavior of the options.)
        if (options.ignoreWhitespace) {
            if (!options.newlineIsToken || !left.includes('\n')) {
                left = left.trim();
            }
            if (!options.newlineIsToken || !right.includes('\n')) {
                right = right.trim();
            }
        }
        else if (options.ignoreNewlineAtEof && !options.newlineIsToken) {
            if (left.endsWith('\n')) {
                left = left.slice(0, -1);
            }
            if (right.endsWith('\n')) {
                right = right.slice(0, -1);
            }
        }
        return super.equals(left, right, options);
    }
}
export const lineDiff = new LineDiff();
export function diffLines(oldStr, newStr, options) {
    return lineDiff.diff(oldStr, newStr, options);
}
export function diffTrimmedLines(oldStr, newStr, options) {
    options = generateOptions(options, { ignoreWhitespace: true });
    return lineDiff.diff(oldStr, newStr, options);
}
// Exported standalone so it can be used from jsonDiff too.
export function tokenize(value, options) {
    if (options.stripTrailingCr) {
        // remove one \r before \n to match GNU diff's --strip-trailing-cr behavior
        value = value.replace(/\r\n/g, '\n');
    }
    const retLines = [], linesAndNewlines = value.split(/(\n|\r\n)/);
    // Ignore the final empty token that occurs if the string ends with a new line
    if (!linesAndNewlines[linesAndNewlines.length - 1]) {
        linesAndNewlines.pop();
    }
    // Merge the content and line separators into single tokens
    for (let i = 0; i < linesAndNewlines.length; i++) {
        const line = linesAndNewlines[i];
        if (i % 2 && !options.newlineIsToken) {
            retLines[retLines.length - 1] += line;
        }
        else {
            retLines.push(line);
        }
    }
    return retLines;
}

// ---- diff/sentence.js
function isSentenceEndPunct(char) {
    return char == '.' || char == '!' || char == '?';
}
class SentenceDiff extends Diff {
    tokenize(value) {
        var _a;
        // If in future we drop support for environments that don't support lookbehinds, we can replace
        // this entire function with:
        //     return value.split(/(?<=[.!?])(\s+|$)/);
        // but until then, for similar reasons to the trailingWs function in string.ts, we are forced
        // to do this verbosely "by hand" instead of using a regex.
        const result = [];
        let tokenStartI = 0;
        for (let i = 0; i < value.length; i++) {
            if (i == value.length - 1) {
                result.push(value.slice(tokenStartI));
                break;
            }
            if (isSentenceEndPunct(value[i]) && value[i + 1].match(/\s/)) {
                // We've hit a sentence break - i.e. a punctuation mark followed by whitespace.
                // We now want to push TWO tokens to the result:
                // 1. the sentence
                result.push(value.slice(tokenStartI, i + 1));
                // 2. the whitespace
                i = tokenStartI = i + 1;
                while ((_a = value[i + 1]) === null || _a === void 0 ? void 0 : _a.match(/\s/)) {
                    i++;
                }
                result.push(value.slice(tokenStartI, i + 1));
                // Then the next token (a sentence) starts on the character after the whitespace.
                // (It's okay if this is off the end of the string - then the outer loop will terminate
                // here anyway.)
                tokenStartI = i + 1;
            }
        }
        return result;
    }
}
export const sentenceDiff = new SentenceDiff();
export function diffSentences(oldStr, newStr, options) {
    return sentenceDiff.diff(oldStr, newStr, options);
}

// ---- diff/css.js
class CssDiff extends Diff {
    tokenize(value) {
        return value.split(/([{}:;,]|\s+)/);
    }
}
export const cssDiff = new CssDiff();
export function diffCss(oldStr, newStr, options) {
    return cssDiff.diff(oldStr, newStr, options);
}

// ---- diff/json.js
class JsonDiff extends Diff {
    constructor() {
        super(...arguments);
        this.tokenize = tokenize;
    }
    get useLongestToken() {
        // Discriminate between two lines of pretty-printed, serialized JSON where one of them has a
        // dangling comma and the other doesn't. Turns out including the dangling comma yields the nicest output:
        return true;
    }
    castInput(value, options) {
        const { undefinedReplacement, stringifyReplacer = (k, v) => typeof v === 'undefined' ? undefinedReplacement : v } = options;
        return typeof value === 'string' ? value : JSON.stringify(canonicalize(value, null, null, stringifyReplacer), null, '  ');
    }
    equals(left, right, options) {
        return super.equals(left.replace(/,([\r\n])/g, '$1'), right.replace(/,([\r\n])/g, '$1'), options);
    }
}
export const jsonDiff = new JsonDiff();
export function diffJson(oldStr, newStr, options) {
    return jsonDiff.diff(oldStr, newStr, options);
}
// This function handles the presence of circular references by bailing out when encountering an
// object that is already on the "stack" of items being processed. Accepts an optional replacer
export function canonicalize(obj, stack, replacementStack, replacer, key) {
    stack = stack || [];
    replacementStack = replacementStack || [];
    if (replacer) {
        obj = replacer(key === undefined ? '' : key, obj);
    }
    let i;
    for (i = 0; i < stack.length; i += 1) {
        if (stack[i] === obj) {
            return replacementStack[i];
        }
    }
    let canonicalizedObj;
    if ('[object Array]' === Object.prototype.toString.call(obj)) {
        stack.push(obj);
        canonicalizedObj = new Array(obj.length);
        replacementStack.push(canonicalizedObj);
        for (i = 0; i < obj.length; i += 1) {
            canonicalizedObj[i] = canonicalize(obj[i], stack, replacementStack, replacer, String(i));
        }
        stack.pop();
        replacementStack.pop();
        return canonicalizedObj;
    }
    if (obj && obj.toJSON) {
        obj = obj.toJSON();
    }
    if (typeof obj === 'object' && obj !== null) {
        stack.push(obj);
        canonicalizedObj = {};
        replacementStack.push(canonicalizedObj);
        const sortedKeys = [];
        let key;
        for (key in obj) {
            /* istanbul ignore else */
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                sortedKeys.push(key);
            }
        }
        sortedKeys.sort();
        for (i = 0; i < sortedKeys.length; i += 1) {
            key = sortedKeys[i];
            canonicalizedObj[key] = canonicalize(obj[key], stack, replacementStack, replacer, key);
        }
        stack.pop();
        replacementStack.pop();
    }
    else {
        canonicalizedObj = obj;
    }
    return canonicalizedObj;
}
