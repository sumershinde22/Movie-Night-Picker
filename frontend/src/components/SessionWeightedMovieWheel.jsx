import { useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import './SessionWeightedMovieWheel.css';

// Slice fills carry the dark label ink, so they have to stay light enough for
// it. At the old 55% lightness a blue slice gave only 3.0:1 against the labels,
// under the 4.5:1 AA floor for the 15.6px they render at; 72% clears 6:1 for
// every hue. axe cannot measure text on an SVG path, so this is checked by hand.
const generateRainbowColors = (count) => {
  if (count <= 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const hue = (index * 360) / count;
    return `hsl(${hue}, 60%, 72%)`;
  });
};

const polarToCartesian = (angle, radius = 100) => {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    x: 100 + radius * Math.cos(radians),
    y: 100 + radius * Math.sin(radians),
  };
};

// Usability study: long titles ran across neighbouring slices and off the rim.
// Labels now sit along the spoke, so each one stays inside its own wedge, and
// anything still too long to fit is clipped rather than allowed to overflow.
const MAX_LABEL_CHARS = 16;

const truncateLabel = (title) =>
  title.length > MAX_LABEL_CHARS
    ? `${title.slice(0, MAX_LABEL_CHARS - 1).trimEnd()}…`
    : title;

// Labels sit on the spoke and read outward. On the left half of the wheel that
// would leave them upside down, so flip those and grow them from the rim inward.
const labelLayout = (middleAngle) =>
  middleAngle > 180
    ? { rotation: middleAngle + 90, textAnchor: 'start' }
    : { rotation: middleAngle - 90, textAnchor: 'end' };

const createSlicePath = (startAngle, endAngle) => {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const angleSize = endAngle - startAngle;
  const largeArcFlag = angleSize > 180 ? 1 : 0;

  // A full 360-degree SVG arc needs to be represented as two arcs.
  if (angleSize >= 359.999) {
    return [
      'M 100 0',
      'A 100 100 0 1 1 99.999 0',
      'A 100 100 0 1 1 100 0',
      'Z',
    ].join(' ');
  }

  return [
    'M 100 100',
    `L ${start.x} ${start.y}`,
    `A 100 100 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
};

function SessionWeightedMovieWheel({ movies, onWinnerSelected }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [transition, setTransition] = useState('none');
  const [wheelWinner, setWheelWinner] = useState(null);
  const timeoutRef = useRef(null);

  const slices = useMemo(() => {
    const colors = generateRainbowColors(movies.length);
    const totalWeight = movies.reduce(
      (total, movie) => total + movie.voteCount,
      0
    );

    let currentAngle = 0;

    return movies.map((movie, index) => {
      const angleSize = (movie.voteCount / totalWeight) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSize;
      const middleAngle = startAngle + angleSize / 2;

      currentAngle = endAngle;

      return {
        ...movie,
        color: colors[index],
        startAngle,
        endAngle,
        middleAngle,
        path: createSlicePath(startAngle, endAngle),
      };
    });
  }, [movies]);

  const spin = () => {
    if (isSpinning || slices.length === 0) return;

    setIsSpinning(true);
    setWheelWinner(null);
    setTransition('none');
    setRotation(0);

    // Pick a random point on the wheel. Because larger slices occupy more
    // degrees, they are proportionally more likely to be selected.
    const randomAngle = Math.random() * 360;

    const selectedSlice =
      slices.find(
        (slice) =>
          randomAngle >= slice.startAngle && randomAngle < slice.endAngle
      ) ?? slices[slices.length - 1];

    const fullRotations = 6 + Math.floor(Math.random() * 4);
    const finalRotation = fullRotations * 360 - selectedSlice.middleAngle;

    // Allow the browser to render the reset before applying the transition.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransition('transform 6s cubic-bezier(0.1, 0.8, 0.3, 1)');
        setRotation(finalRotation);
      });
    });

    timeoutRef.current = window.setTimeout(async () => {
      try {
        await onWinnerSelected(selectedSlice);
        setWheelWinner(selectedSlice);
      } finally {
        setIsSpinning(false);
      }
    }, 6000);
  };

  if (slices.length === 0) {
    return (
      <div className="weighted-wheel-empty">
        No movies received a YES vote, so the wheel cannot be spun.
      </div>
    );
  }

  return (
    <div className="weighted-wheel-container">
      <div className="weighted-wheel-pointer">
        <div className="weighted-wheel-pointer-triangle" />
      </div>

      <div
        className="weighted-wheel-rotation"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition,
        }}
      >
        <svg
          className="weighted-wheel"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={`Weighted picker wheel with ${slices.length} movies. Each slice is sized by the votes that movie received.`}
        >
          {slices.map((slice) => {
            // Anchor at the rim and grow inward, along the slice's own spoke.
            const labelPosition = polarToCartesian(slice.middleAngle, 90);
            const { rotation: labelRotation, textAnchor } = labelLayout(
              slice.middleAngle
            );

            return (
              <g key={slice.movieId}>
                <path
                  d={slice.path}
                  fill={slice.color}
                  stroke="rgba(16, 19, 26, 0.6)"
                  strokeWidth="1"
                />

                {slice.endAngle - slice.startAngle >= 14 && (
                  <text
                    x={labelPosition.x}
                    y={labelPosition.y}
                    textAnchor={textAnchor}
                    transform={`rotate(
                      ${labelRotation}
                      ${labelPosition.x}
                      ${labelPosition.y}
                    )`}
                  >
                    {truncateLabel(slice.title)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="weighted-wheel-border" />

      <button
        type="button"
        className="weighted-wheel-center"
        onClick={spin}
        disabled={isSpinning}
      >
        {isSpinning ? 'Spinning…' : 'SPIN!'}
      </button>

      {/* The result is conveyed visually by the wheel stopping, so mirror it in
          a live region for anyone who cannot see the animation. */}
      <p role="status" className="weighted-wheel-winner-live">
        {wheelWinner ? `${wheelWinner.title} wins!` : ''}
      </p>

      {wheelWinner && (
        <div
          className="weighted-wheel-winner"
          style={{ color: wheelWinner.color }}
          aria-hidden="true"
        >
          {wheelWinner.title} wins!
        </div>
      )}
    </div>
  );
}

SessionWeightedMovieWheel.propTypes = {
  movies: PropTypes.arrayOf(
    PropTypes.shape({
      movieId: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
        .isRequired,
      title: PropTypes.string.isRequired,
      voteCount: PropTypes.number.isRequired,
    })
  ).isRequired,
  onWinnerSelected: PropTypes.func.isRequired,
};

export default SessionWeightedMovieWheel;
