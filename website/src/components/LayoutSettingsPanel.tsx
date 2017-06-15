import * as React from 'react';
import {MillimeterInputField} from './MillimeterInputField';

export class LayoutSettings {
    /**
     * Margin at the left.
     */
    marginLeft: number;

    /**
     * Margin at the top.
     */
    marginTop: number;

    /**
     * Width of the plottable area.
     */
    plotWidth: number;

    constructor(plotWidth: number, marginTop: number, marginLeft: number) {
        this.plotWidth = plotWidth;
        this.marginTop = marginTop;
        this.marginLeft = marginLeft;
    }
}

export interface LayoutSettingsPanelProps {
    onChange: (settings: LayoutSettings) => any;
    settings: LayoutSettings;
}

export const LayoutSettingsPanel: React.SFC<LayoutSettingsPanelProps> = (props) => {
    const {marginLeft, marginTop, plotWidth} = props.settings;
    return (<fieldset>
        <legend>Layout</legend>
        <label className="single-num-input">
            <span>Plot width:</span>
            <MillimeterInputField
                value={plotWidth}
                onChange={val => props.onChange(new LayoutSettings(val, marginTop, marginLeft))}/>
        </label>
        <label className="single-num-input">
            <span>Margin top:</span>
            <MillimeterInputField
                value={marginTop}
                onChange={val => props.onChange(new LayoutSettings(plotWidth, val, marginLeft))}/>
        </label>
        <label className="single-num-input">
            <span>Margin left:</span>
            <MillimeterInputField
                value={marginLeft}
                onChange={val => props.onChange(new LayoutSettings(plotWidth, marginTop, val))}/>
        </label>
    </fieldset>);
};
