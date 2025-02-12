/*
 * Copyright (c) 2020 The Ontario Institute for Cancer Research. All rights reserved
 *
 * This program and the accompanying materials are made available under the terms of
 * the GNU Affero General Public License v3.0. You should have received a copy of the
 * GNU Affero General Public License along with this program.
 *  If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import * as React from 'react';
import { TableProps } from 'react-table';
import selectTable, {
  SelectAllInputComponentProps,
  SelectInputComponentProps,
  SelectTableAdditionalProps,
} from 'react-table/lib/hoc/selectTable';
import { DnaLoader } from '../DnaLoader';
import { Checkbox } from '../form/Checkbox';
import { useElementDimension } from '../utils/Hook/useElementDimension';
import { NoDataComponent as DefaultNoDataComponent } from './NoDataComponent';
import { StyledTable, StyledTableProps } from './styledComponent';
import { TablePagination } from './TablePagination';

export { TableActionBar, TablePagination } from './TablePagination';

export type TableVariant = 'DEFAULT' | 'STATIC';
export type TableDataBase = {
  [k: string]: any;
};

export const DefaultTrComponent = ({ rowInfo, primaryKey, selectedIds, ...props }: any) => {
  const thisRowId = get(rowInfo, `original.${primaryKey}`);
  const selected = selectedIds.some((id) => id === thisRowId);
  return (
    <div
      {...props}
      role="row"
      className={`rt-tr ${props.className} ${selected ? 'selected' : ''}`}
    />
  );
};

export const DefaultLoadingComponent = ({
  loading,
  loadingText,
}: {
  loading?: boolean;
  loadingText?: string;
}) => (
  <div
    role="alert"
    aria-busy="true"
    className={`-loading ${loading ? '-active' : ''}`}
    style={{ display: 'flex', alignItems: 'center' }}
  >
    <div
      className="-loading-inner"
      style={{
        display: 'flex',
        justifyContent: 'center',
        transform: 'none',
        top: 'initial',
      }}
    >
      <DnaLoader />
    </div>
  </div>
);

export type TableColumnConfig<Data extends TableDataBase> = TableProps<Data>['columns'][0] & {
  accessor?: TableProps<Data>['columns'][0]['accessor'] | keyof Data;
  Cell?: TableProps<Data>['columns'][0]['Cell'] | ((c: { original: Data }) => React.ReactNode);
  style?: React.CSSProperties;
};
export function Table<Data extends TableDataBase>({
  variant = 'DEFAULT',
  withRowBorder = variant === 'STATIC',
  withOutsideBorder,
  cellAlignment,
  stripped = variant === 'DEFAULT',
  highlight = variant === 'DEFAULT',
  showPagination = variant === 'DEFAULT',
  sortable = variant === 'DEFAULT',
  resizable = variant === 'DEFAULT',
  className = '',
  PaginationComponent = TablePagination,
  LoadingComponent = DefaultLoadingComponent,
  NoDataComponent = DefaultNoDataComponent,
  columns,
  data,
  getTableProps = ({ data }) => {
    if (isEmpty(data)) {
      return {
        style: {
          opacity: 0.3,
        },
      };
    } else {
      return {};
    }
  },
  parentRef,
  withResizeBlur = false,
  ...rest
}: Partial<TableProps<Data>> & {
  variant?: TableVariant;
  highlight?: boolean;
  stripped?: boolean;
  selectedIds?: Array<any>;
  primaryKey?: string;
  columns: Array<TableColumnConfig<Data>>; //columns is required
  parentRef: React.RefObject<HTMLElement>;
  withResizeBlur?: boolean;
} & StyledTableProps) {
  const TrComponent = rest.TrComponent || DefaultTrComponent;
  const getTrProps = rest.getTrProps || (() => ({}));

  // these are props passed by SelectTable. Defaults are not exposed in props for encapsulation
  const selectedIds = rest.selectedIds || [];
  const isSelectTable = rest.isSelectTable || false;
  const primaryKey = rest.primaryKey || 'id';

  // react-table needs an explicit pixel width to handle horizontal scroll properly.
  // This syncs up the component's width to its container.
  const { width, resizing } = useElementDimension(parentRef);

  return (
    <StyledTable
      style={{
        // this is written with style object because css prop somehow only applies to the header
        transition: 'all 0.25s',
        filter: resizing && withResizeBlur ? 'blur(8px)' : 'blur(0px)',
        width,
      }}
      withRowBorder={withRowBorder}
      withOutsideBorder={withOutsideBorder}
      cellAlignment={cellAlignment}
      getTableProps={getTableProps}
      columns={columns}
      data={data}
      isSelectTable={isSelectTable}
      className={`${className} ${stripped ? '-striped' : ''} ${highlight ? '-highlight' : ''}`}
      TrComponent={(props) => (
        <TrComponent {...props} primaryKey={primaryKey} selectedIds={selectedIds} />
      )}
      LoadingComponent={LoadingComponent}
      getTrProps={(state, rowInfo, column) => ({
        rowInfo,
        ...getTrProps(state, rowInfo, column),
      })}
      minRows={0}
      PaginationComponent={PaginationComponent}
      NoDataComponent={NoDataComponent}
      showPagination={isEmpty(data) ? false : showPagination}
      getNoDataProps={(x) => x}
      sortable={sortable}
      resizable={resizable}
      {...rest}
    />
  );
}

/**
 * SelectTable provides the row selection capability with the
 * selectTable HOC.
 */
const SelectTableCheckbox: React.ComponentType<
  SelectInputComponentProps & SelectAllInputComponentProps
> = ({ checked, onClick, id }) => (
  // @ts-ignore aria-label not supported by ts
  <Checkbox
    value={id}
    checked={checked}
    onChange={() => onClick(id, null, null)}
    aria-label="table-select"
  />
);

const TableWithSelect = selectTable(Table);

export function useSelectTableSelectionState<TableEntry = {}>({
  selectionKeyField,
  totalEntriesCount,
}: {
  totalEntriesCount: number;
  selectionKeyField: keyof TableEntry;
}) {
  const [allRowsSelected, setAllRowsSelected] = React.useState(false);
  const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
  const [unselectedRows, setUnselectedRows] = React.useState<string[]>([]);

  const selectionStringToRowId = (selectionString: string) =>
    // react table prepends the word `select-` to the selected objectIds
    selectionString.replace('select-', '');

  const setSelectedRowIds = (selectionString: string[]) =>
    setSelectedRows(selectionString.map(selectionStringToRowId));

  const setUnselectedRowIds = (selectionString: string[]) =>
    setUnselectedRows(selectionString.map(selectionStringToRowId));

  const toggleHandler: React.ComponentProps<typeof SelectTable>['toggleSelection'] = (
    selectionString,
  ) => {
    const rowId = selectionStringToRowId(selectionString);
    const notMatchesSelectionString = (id: string) => id !== rowId;
    if (allRowsSelected) {
      setUnselectedRowIds(
        unselectedRows.includes(rowId)
          ? unselectedRows.filter(notMatchesSelectionString)
          : [...unselectedRows, rowId],
      );
    } else {
      setSelectedRowIds(
        selectedRows.includes(rowId)
          ? selectedRows.filter(notMatchesSelectionString)
          : [...selectedRows, rowId],
      );
    }
  };
  const toggleAllHandler: React.ComponentProps<typeof SelectTable>['toggleAll'] = () => {
    setSelectedRowIds([]);
    setUnselectedRowIds([]);
    setAllRowsSelected(!allRowsSelected);
  };
  const isSelected: React.ComponentProps<typeof SelectTable>['isSelected'] = (objectId) =>
    allRowsSelected ? !unselectedRows.includes(objectId) : selectedRows.includes(objectId);

  const selectedRowsCount = allRowsSelected
    ? totalEntriesCount - unselectedRows.length
    : selectedRows.length;

  return {
    selectionKeyField,
    selectedRows,
    unselectedRows,
    allRowsSelected,
    toggleHandler,
    toggleAllHandler,
    isSelected,
    selectedRowsCount,
  };
}

export function SelectTable<Data extends TableDataBase>(
  props: Partial<TableProps<Data>> &
    Partial<SelectTableAdditionalProps> & {
      columns: Array<TableColumnConfig<Data>>; //columns is required
      parentRef: React.RefObject<HTMLElement>;
      withResizeBlur?: boolean;
    },
) {
  const { isSelected, data, keyField } = props;
  const selectedIds = (data || []).map((data) => data[keyField]).filter(isSelected);
  return (
    <TableWithSelect
      {...props}
      isSelectTable
      primaryKey={keyField}
      selectedIds={selectedIds}
      SelectInputComponent={SelectTableCheckbox}
      SelectAllInputComponent={SelectTableCheckbox}
    />
  );
}
