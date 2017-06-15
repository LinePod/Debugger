import * as React from 'react';
import {MillimeterInputField} from './MillimeterInputField';
import {PageSize, PageSizeSelector} from './PageSizeSelector';
import {LayoutSettings, LayoutSettingsPanel} from './LayoutSettingsPanel';

export interface SidebarProps {
    layoutSettings: LayoutSettings,
    lineThickness: number;
    onClear: () => any;
    onLayoutSettingsChanged: (settings: LayoutSettings) => any;
    onLineThicknessChanged: (thickness: number) => any;
    onSizeChanged: (size: PageSize, reverseOrientation: boolean) => any;
    pageSize: PageSize;
    reverseOrientation: boolean;
}

export const Sidebar: React.SFC<SidebarProps> = (props) => {
    return <div className="sidebar">
        <form>
            <h1>Settings</h1>
            <PageSizeSelector
                pageSize={props.pageSize}
                reverseOrientation={props.reverseOrientation}
                onChange={props.onSizeChanged}/>
            <LayoutSettingsPanel
                onChange={props.onLayoutSettingsChanged}
                settings={props.layoutSettings}/>
            <p>
                <label className="single-num-input">
                    <span>Line thickness:</span>
                    <MillimeterInputField
                    value={props.lineThickness}
                    min={0.1}
                    step={0.1}
                    precision={1}
                    onChange={props.onLineThicknessChanged}/>
                </label>
            </p>
            <p>
                <button type="button" onClick={props.onClear}>
                    Clear page
                </button>
            </p>
        </form>
    </div>;
};
