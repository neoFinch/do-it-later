import { FC } from 'react';

interface CaptureLearningExpectationsProps {
  youWillLearn: string[];
  youWillNotLearn: string[];
}

const CaptureLearningExpectations: FC<CaptureLearningExpectationsProps> = ({
  youWillLearn,
  youWillNotLearn
}) => {
  if (youWillLearn.length === 0 && youWillNotLearn.length === 0) {
    return null;
  }

  return (
    <section className="capture-detail__section capture-learning">
      {youWillLearn.length > 0 && (
        <div className="capture-learning__block">
          <h2 className="capture-learning__heading">You&apos;ll learn</h2>
          <ul className="capture-learning__list capture-learning__list--positive">
            {youWillLearn.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {youWillNotLearn.length > 0 && (
        <div className="capture-learning__block">
          <h2 className="capture-learning__heading">You won&apos;t learn</h2>
          <ul className="capture-learning__list capture-learning__list--negative">
            {youWillNotLearn.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default CaptureLearningExpectations;
