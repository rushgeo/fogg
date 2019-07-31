import React from 'react';
import { shallow } from 'enzyme';

import { LensMapDraw } from '../../ui';

describe('LensMapDraw', () => {
  describe('Render', () => {
    const lensMapDraw = shallow(<LensMapDraw />);
    const lensMapDrawDive = lensMapDraw.dive();
    const mapDraw = lensMapDrawDive.find('MapDrawWithRefs');

    it('should render the component', () => {
      expect(lensMapDraw.exists()).toEqual(true);
    });

    it('should render a MapDraw component with forwarded refs', () => {
      expect(mapDraw.exists()).toEqual(true);
    });
  });
});
