import rawHtml from '../html/ToyLaserSprint.html?raw';
import meow01 from '../../audio/cat-meow-01.mp3';
import meow02 from '../../audio/cat-meow-02.mp3';
import meow03 from '../../audio/cat-meow-03.mp3';
import meow04 from '../../audio/cat-meow-04.mp3';
import meow05 from '../../audio/cat-meow-05.mp3';
import meow06 from '../../audio/cat-meow-06.mp3';
import { createToyComponent } from './createToyComponent';

const html = rawHtml.replace(
  '__LASER_SPRINT_MEOW_URLS__',
  JSON.stringify([meow01, meow02, meow03, meow04, meow05, meow06]),
);

export const previewHtml = html;

export default createToyComponent(html, 'Laser Sprint');
