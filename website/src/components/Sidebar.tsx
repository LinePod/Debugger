import * as React from 'react';
import {MillimeterInputField} from './MillimeterInputField';
import {PageSize, PageSizeSelector} from './PageSizeSelector';

export interface SidebarProps {
    pageSize: PageSize;
    reverseOrientation: boolean;
    lineThickness: number;
    onClear: () => any;
    onLineThicknessChanged: (thickness: number) => any;
    onSizeChanged: (size: PageSize, reverseOrientation: boolean) => any;
}

export const Sidebar: React.SFC<SidebarProps> = (props) => {
    return <div className="sidebar">
        <form>
            <h1>Settings</h1>
            <PageSizeSelector
                pageSize={props.pageSize}
                reverseOrientation={props.reverseOrientation}
                onChange={props.onSizeChanged}/>
            <p>
                <label>
                    Line thickness: <MillimeterInputField
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
