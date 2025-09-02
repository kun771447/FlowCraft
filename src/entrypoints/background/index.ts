import { recording } from "./record";
import { replay } from "./replay";

export default defineBackground(() => {
  recording();
  replay();
});
