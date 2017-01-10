import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {Debugger} from './components/Debugger';

ReactDOM.render(
    <Debugger websocketPort={8080}/>,
    document.getElementById('react-root')
);
