import { FC } from 'react';

interface CaptureLearningExpectationsProps {
  youWillGet: string[];
  youWillNotGet: string[];
}

const CaptureLearningExpectations: FC<CaptureLearningExpectationsProps> = ({
  youWillGet,
  youWillNotGet
}) => {
  if (youWillGet.length === 0 && youWillNotGet.length === 0) {
    return null;
  }

  return (
    <section className="capture-detail__section capture-learning">
      {youWillGet.length > 0 && (
        <div className="capture-learning__block">
          <h2 className="capture-learning__heading">You&apos;ll get</h2>
          <ul className="capture-learning__list capture-learning__list--positive">
            {youWillGet.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {youWillNotGet.length > 0 && (
        <div className="capture-learning__block">
          <h2 className="capture-learning__heading">You won&apos;t get</h2>
          <ul className="capture-learning__list capture-learning__list--negative">
            {youWillNotGet.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default CaptureLearningExpectations;
