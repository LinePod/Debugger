import * as React from 'react';
import {MillimeterInputField} from './MillimeterInputField';

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
        return {size: [width, height], name};
    }
}

export const A4_PAGE_SIZE = new PageSize(210, 297, 'A4');

const PAGE_SIZES = [
    A4_PAGE_SIZE,
    new PageSize(250, 353, 'B4'),
    new PageSize(148, 210, 'A5'),
    new PageSize(176, 250, 'B5'),
    new PageSize(105, 148, 'A6'),
    new PageSize(125, 176, 'B6'),
    new PageSize(216, 279, 'US Letter'),
    new PageSize(216, 356, 'US Legal'),
];

interface Props {
    onChange: (pageSize: PageSize, reverseOrientation: boolean) => any;
    pageSize: PageSize;
    reverseOrientation: boolean;
}

interface State {
    customHeight: number;
    customWidth: number;
}

export class PageSizeSelector extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            customHeight: 100,
            customWidth: 100,
        };
    }

    private get customPageSize(): PageSize {
        return new PageSize(
            this.state.customWidth,
            this.state.customHeight
        );
    }

    private updateCustomSize(width: number, height: number) {
        this.setState({
            customWidth: width,
            customHeight: height,
        }, () => {
            if (this.props.pageSize.name == null) {
                this.props.onChange(this.customPageSize, this.props.reverseOrientation);
            }
        });
    }

    private renderCustomSizeSelector() {
        const disabled = this.props.pageSize.name != null;
        const widthInput = <MillimeterInputField
            min={1}
            value={this.state.customWidth}
            disabled={disabled}
            onChange={(num: number) => this.updateCustomSize(num, this.state.customHeight)}/>;
        const heightInput = <MillimeterInputField
            min={1}
            value={this.state.customHeight}
            disabled={disabled}
            onChange={(num: number) => this.updateCustomSize(this.state.customWidth, num)}/>;
        return <li key="custom">
            <label>
                <input
                    type="radio"
                    name="pagesize"
                    onChange={() => {
                        this.props.onChange(this.customPageSize, this.props.reverseOrientation);
                    }}
                    checked={this.props.pageSize.name == null}/>
                {' Custom'}
            </label>
            <p className="custom-size">
                {widthInput}
                {' × '}
                {heightInput}
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
                        onChange={() => this.props.onChange(size, this.props.reverseOrientation)}
                        checked={size === this.props.pageSize}/>
                        {` ${size.name} `}
                        <small>{`(${size.size[0]}mm × ${size.size[1]}mm)`}</small>
                </label>
            </li>;
        });
        pageSizeSelectors.push(this.renderCustomSizeSelector());
        return pageSizeSelectors;
    }

    render() {
        return (<fieldset>
            <legend>Page size</legend>
            <ul>
                {this.renderPageSizeSelectors()}
            </ul>

            <label>
                <input
                    type="checkbox"
                    onChange={() => {
                      this.props.onChange(this.props.pageSize, !this.props.reverseOrientation);
                    }}
                    checked={this.props.reverseOrientation}/>
                {' Landscape'}
            </label>
        </fieldset>);
    }
}
