import * as React from 'react';

export class PageSize {
    /**
     * Optional name that is set if the size corresponds to a standard size.
     */
    name?: string;

    /**
     * Size of the page in millimeters.
     */
    size: [number, number];

    constructor(width: number, height: number, name?: string) {
        return { size: [width, height], name };
    }
}

export const A4_PAGE_SIZE = new PageSize(210, 297, 'A4');

const PAGE_SIZES = [
    A4_PAGE_SIZE,
    new PageSize(148, 210, 'A5'),
    new PageSize(210, 148, 'A5 (portrait)'),
    new PageSize(105, 148, 'A6'),
    new PageSize(216, 279, 'US Letter'),
    new PageSize(216, 356, 'US Legal'),
];

export interface SidebarProps {
    pageSize: PageSize;
    onClear: () => any;
    onSizeChanged: (size: PageSize) => any;
}

interface SidebarState {
    customHeight: number;
    customWidth: number;
}

export class Sidebar extends React.Component<SidebarProps, SidebarState> {
    constructor(props: SidebarProps) {
        super(props);
        this.state = {
            customHeight: 100,
            customWidth: 100,
        };
    }

    private updateCustomSize(width: number, height: number) {
        this.setState({
            customWidth: width,
            customHeight: height,
        });
        if (this.props.pageSize.name == null) {
            this.props.onSizeChanged(new PageSize(width, height));
        }
    }

    private renderCustomSizeSelector() {
        const isCustomSize = this.props.pageSize.name == null;
        return <li key="custom">
            <label>
                <input
                    type="radio"
                    name="pagesize"
                    onChange={() => {
                        this.props.onSizeChanged(new PageSize(
                            this.state.customWidth,
                            this.state.customHeight
                        ));
                    }}
                    checked={isCustomSize}/>
                {' Custom'}
            </label>
            <p className="custom-size">
                <input
                    type="number"
                    value={this.state.customWidth}
                    onChange={event => {
                        if (!Number.isNaN(event.target.valueAsNumber)) {
                            this.updateCustomSize(
                                event.target.valueAsNumber,
                                this.state.customHeight
                            );
                        }
                    }}
                    disabled={!isCustomSize}/>
                {'mm x '}
                <input
                    type="number"
                    value={this.state.customHeight}
                    onChange={event => {
                        if (!Number.isNaN(event.target.valueAsNumber)) {
                            this.updateCustomSize(
                                this.state.customWidth,
                                event.target.valueAsNumber
                            );
                        }
                    }}
                    disabled={!isCustomSize}/>
                mm
            </p>
        </li>;
    }

    private renderPageSizeSelectors() {
        const pageSizeSelectors = PAGE_SIZES.map(size => {
            return <li key={size.name}>
                <label>
                    <input
                        type="radio"
                        name="pagesize"
                        onChange={() => this.props.onSizeChanged(size)}
                        checked={size === this.props.pageSize}/>
                    {' ' + size.name}
                </label>
            </li>;
        });
        pageSizeSelectors.push(this.renderCustomSizeSelector());
        return pageSizeSelectors;
    }

    render() {
        return <div className="sidebar">
            <form>
                <h1>Settings</h1>
                <fieldset>
                    <legend>Page size</legend>
                    <ul>
                        {this.renderPageSizeSelectors()}
                    </ul>
                </fieldset>
                <p>
                    <button type="button" onClick={this.props.onClear}>
                        Clear page
                    </button>
                </p>
            </form>
        </div>;
    }
}
