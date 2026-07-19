import { useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import './SessionWeightedMovieWheel.css';

const generateRainbowColors = (count) => {
  if (count <= 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const hue = (index * 360) / count;
    return `hsl(${hue}, 50%, 55%)`;
  });
};

const polarToCartesian = (angle, radius = 100) => {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    x: 100 + radius * Math.cos(radians),
    y: 100 + radius * Math.sin(radians),
  };
};

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
          aria-label="Weighted movie selection wheel"
        >
          {slices.map((slice) => {
            const labelPosition = polarToCartesian(slice.middleAngle, 60);

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
                    transform={`rotate(
                      ${slice.middleAngle + 90}
                      ${labelPosition.x}
                      ${labelPosition.y}
                    )`}
                  >
                    {slice.title.length > 12 ? slice.title.slice(0, 12) + '…' : slice.title}
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

      {wheelWinner && (
        <div
          className="weighted-wheel-winner"
          style={{ color: wheelWinner.color }}
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
