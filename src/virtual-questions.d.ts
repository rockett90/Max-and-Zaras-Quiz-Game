/** Served by build/questionsPlugin.ts: the validated question bank. */
declare module 'virtual:questions' {
  const questions: import('./game/questionSchema').Question[];
  export default questions;
}
