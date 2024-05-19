import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Stack, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
  GridToolbarDensitySelector
} from '@mui/x-data-grid';
import { zhCN } from '@mui/x-data-grid/locales';
import { API } from 'utils/api';
import { showError } from 'utils/common';
import { ValueFormatter, priceType } from 'views/Pricing/component/util';

// ----------------------------------------------------------------------
export default function ModelPrice() {
  const [rows, setRows] = useState([]);
  const [userModelList, setUserModelList] = useState([]);
  const [prices, setPrices] = useState({});
  const [ownedby, setOwnedby] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');

  const fetchOwnedby = useCallback(async () => {
    try {
      const res = await API.get('/api/ownedby');
      const { success, message, data } = res.data;
      if (success) {
        let ownedbyList = [];
        for (let key in data) {
          ownedbyList.push({ value: parseInt(key), label: data[key] });
        }
        setOwnedby(ownedbyList);
      } else {
        showError(message);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await API.get('/api/prices');
      const { success, message, data } = res.data;
      if (success) {
        let pricesObj = {};
        data.forEach((price) => {
          if (pricesObj[price.model] === undefined) {
            pricesObj[price.model] = price;
          }
        });
        setPrices(pricesObj);
      } else {
        showError(message);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchUserModelList = useCallback(async () => {
    try {
      const res = await API.get('/api/user/models');
      if (res === undefined) {
        setUserModelList([]);
        return;
      }
      setUserModelList(res.data.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (userModelList.length === 0 || Object.keys(prices).length === 0 || ownedby.length === 0) {
      return;
    }

    let newRows = [];
    userModelList.forEach((model, index) => {
      const price = prices[model.id];
      newRows.push({
        id: index + 1,
        model: model.id,
        type: price?.type,
        channel_type: price?.channel_type,
        input: price?.input !== undefined && price?.input !== null ? price.input : 30,
        output: price?.output !== undefined && price?.output !== null ? price.output : 30
      });
    });
    setRows(newRows);
  }, [userModelList, ownedby, prices]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([fetchOwnedby(), fetchUserModelList()]);
        fetchPrices();
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [fetchOwnedby, fetchUserModelList, fetchPrices]);

  const handleSupplierChange = (event) => {
    setSelectedSupplier(event.target.value);
  };

  const filteredRows = useMemo(() => {
    if (!selectedSupplier) return rows;
    return rows.filter(row => row.channel_type === parseInt(selectedSupplier));
  }, [rows, selectedSupplier]);

  const modelRatioColumns = useMemo(
    () => [
      {
        field: 'model',
        sortable: true,
        headerName: '模型名称',
        minWidth: 220,
        flex: 1
      },
      {
        field: 'type',
        sortable: true,
        headerName: '类型',
        flex: 0.5,
        minWidth: 100,
        type: 'singleSelect',
        valueOptions: priceType
      },
      {
        field: 'channel_type',
        sortable: true,
        headerName: '供应商',
        flex: 0.5,
        minWidth: 100,
        type: 'singleSelect',
        valueOptions: ownedby
      },
      {
        field: 'input',
        sortable: true,
        headerName: '输入倍率',
        flex: 0.8,
        minWidth: 150,
        type: 'number',
        valueFormatter: (params) => ValueFormatter(params.value)
      },
      {
        field: 'output',
        sortable: true,
        headerName: '输出倍率',
        flex: 0.8,
        minWidth: 150,
        type: 'number',
        valueFormatter: (params) => ValueFormatter(params.value)
      }
    ],
    [ownedby]
  );

  function EditToolbar() {
    return (
      <GridToolbarContainer style={{paddingTop: 16}}>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />
        <GridToolbarQuickFilter />
        <FormControl variant="outlined" size="small" style={{ marginLeft: 16, width: 200 }}>
          <InputLabel id="supplier-select-label">供应商</InputLabel>
          <Select
            labelId="supplier-select-label"
            id="supplier-select"
            value={selectedSupplier}
            onChange={handleSupplierChange}
            label="供应商"
            style={{ height: '40px' }}  // 设置 Select 的高度
          >
            <MenuItem value="">
              <em>全部</em>
            </MenuItem>
            {ownedby.map((supplier) => (
              <MenuItem key={supplier.value} value={supplier.value}>
                {supplier.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

      </GridToolbarContainer>
    );
  }

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
        <Typography variant="h4">可用模型</Typography>
      </Stack>
      <Card>
        <DataGrid
          rows={filteredRows}
          columns={modelRatioColumns}
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          pageSizeOptions={[20, 30, 50, 100]}
          disableRowSelectionOnClick
          slots={{ toolbar: EditToolbar }}
          localeText={zhCN.components.MuiDataGrid.defaultProps.localeText}
        />
      </Card>
    </>
  );
}
