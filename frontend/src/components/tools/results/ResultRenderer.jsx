import TextResult from './TextResult';
import ExerciseSetResult from './ExerciseSetResult';
import RubricResult from './RubricResult';
import TimelineResult from './TimelineResult';
import QuizResult from './QuizResult';
import CommentaryResult from './CommentaryResult';

// Switch por output_kind. Cualquier kind desconocido cae en TextResult,
// que pinta string o JSON con sangría como debug-friendly fallback.
export default function ResultRenderer({ kind, data }) {
  switch (kind) {
    case 'exercise_set': return <ExerciseSetResult data={data} />;
    case 'rubric':       return <RubricResult data={data} />;
    case 'timeline':     return <TimelineResult data={data} />;
    case 'quiz':         return <QuizResult data={data} />;
    case 'commentary':   return <CommentaryResult data={data} />;
    case 'text':
    default:             return <TextResult data={data} />;
  }
}
