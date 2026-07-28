/**
 * Grade Calculation Engine
 * Score breakdown: CA1 (30) + CA2 (30) + Exam (40) = 100
 */

function getGradeAndRemark(score) {
  if (score >= 70) return { grade: 'A', remark: 'Excellent' };
  if (score >= 60) return { grade: 'B', remark: 'Very Good' };
  if (score >= 50) return { grade: 'C', remark: 'Good' };
  if (score >= 45) return { grade: 'D', remark: 'Fair' };
  if (score >= 40) return { grade: 'E', remark: 'Pass' };
  return { grade: 'F', remark: 'Fail' };
}

function calculateTotal({ ca1 = 0, ca2 = 0, exam = 0 }) {
  return Number(ca1) + Number(ca2) + Number(exam);
}

/**
 * Calculate average from an array of scores.
 * @param {number[]} scores
 * @returns {number}
 */
function calculateAverage(scores) {
  if (!scores || scores.length === 0) return 0;
  const sum = scores.reduce((acc, s) => acc + Number(s), 0);
  return parseFloat((sum / scores.length).toFixed(2));
}

/**
 * Assign positions to students based on their averages (highest = 1st).
 * Students with equal averages share the same position.
 * @param {{ student_id: number, average: number }[]} studentAverages
 * @returns {{ student_id: number, position: number }[]}
 */
function assignPositions(studentAverages) {
  // Sort descending by average
  const sorted = [...studentAverages].sort((a, b) => b.average - a.average);

  const positions = [];
  let currentPosition = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].average < sorted[i - 1].average) {
      currentPosition = i + 1;
    }
    positions.push({
      student_id: sorted[i].student_id,
      position: currentPosition
    });
  }

  return positions;
}

/**
 * Get a principal's remark based on average score.
 * @param {number} average
 * @returns {string}
 */
function getPrincipalRemark(average) {
  if (average >= 70) return 'Outstanding performance. Keep it up!';
  if (average >= 60) return 'Very good performance. Well done!';
  if (average >= 50) return 'Good performance. Keep improving!';
  if (average >= 45) return 'Fair performance. You can do better.';
  if (average >= 40) return 'Average performance. More effort needed.';
  return 'Poor performance. Please work harder.';
}

/**
 * Ordinal suffix for position numbers (1st, 2nd, 3rd, etc.)
 * @param {number} n
 * @returns {string}
 */
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

module.exports = {
  getGradeAndRemark,
  calculateTotal,
  calculateAverage,
  assignPositions,
  getPrincipalRemark,
  ordinal
};
