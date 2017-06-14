/// <reference path="../react-numeric-input.d.ts"/>
import * as React from 'react';
import * as NumericInput from 'react-numeric-input';

export interface MillimeterInputFieldProps {
    disabled?: boolean;
    max?: number;
    min?: number;
    onChange: (value: number) => any;
    precision?: number;
    step?: number;
    value: number;
}

export const MillimeterInputField: React.SFC<MillimeterInputFieldProps> = (props) => {
    return <NumericInput
        {...props}
        format={(num: number) => `${num}mm`}/>;
};
