import type { ReactElement } from 'react';

//A very small placeholder shown while content loads.
//Hosts can pass their own loading component to replace this.
export const DefaultLoader = (): ReactElement => {
  return (
    <span
      aria-busy="true"
      style={{
        display: 'inline-block',
        minWidth: '3rem',
        opacity: 0.5,
        borderRadius: '0.25rem',
        background: 'currentColor',
      }}
    >
      &nbsp;
    </span>
  );
};
