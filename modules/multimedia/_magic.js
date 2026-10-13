// Magic hints for media operations.
import { analyses } from '../../core/magic-detect.js';

const audio = ({ at }) => at('ID3') || (at('RIFF') && at('WAVE', 8)) || at('fLaC') || at('OggS') || at('FORM');
analyses('Extract Audio Metadata', ctx => audio(ctx) ? 0.85 : null);
analyses('Extract ID3', ({ at }) => at('ID3') ? 0.9 : null);
