import { module } from './_cat.js';
import { snappyCompress } from './_snappy.js';

module('Snappy Compress', "Compresses with Snappy (Google's fast, low-ratio compressor used in LevelDB, Cassandra, Hadoop...).", [], (data) => snappyCompress(data));
