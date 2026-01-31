import { Fyo, t } from 'fyo';
import { DateTime } from 'luxon';
import { ModelNameEnum } from 'models/types';
import { Report } from 'reports/Report';
import { ColumnField, ReportData, ReportRow } from 'reports/types';
import { Field, FieldTypeEnum } from 'schemas/types';
import { QueryFilter } from 'utils/db/types';
import { safeParseFloat } from 'utils/index';
import getCommonExportActions from 'reports/commonExporter';

interface AtomicProfitLossEntry {
  item: string;
  quantity: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
  contributionPercent: number;
  party?: string;
  account?: string;
}

interface SalesInvoiceItem {
  item: string;
  quantity: number;
  amount: number;
  parent: string;
  rate: number;
}

interface PurchaseInvoiceItem {
  item: string;
  quantity: number;
  amount: number;
  parent: string;
  rate: number;
}

interface Invoice {
  name: string;
  date: string;
  party: string;
}

export class AtomicProfitAndLoss extends Report {
  static title = t`Atomic Profit and Loss`;
  static reportName = 'atomic-profit-and-loss';
  usePagination = true;
  loading = false;
  shouldRefresh = false;

  fromDate?: string;
  toDate?: string;
  itemType: 'Sales' | 'Purchase' | 'Both' = 'Both';
  groupBy: 'Item' | 'Party' | 'Account' = 'Item';

  constructor(fyo: Fyo) {
    super(fyo);
    this._setObservers();
  }

  _setObservers() {
    const listener = () => (this.shouldRefresh = true);

    this.fyo.doc.observer.on(`sync:${ModelNameEnum.SalesInvoice}`, listener);

    this.fyo.doc.observer.on(`sync:${ModelNameEnum.PurchaseInvoice}`, listener);

    this.fyo.doc.observer.on(
      `sync:${ModelNameEnum.SalesInvoiceItem}`,
      listener
    );

    this.fyo.doc.observer.on(
      `sync:${ModelNameEnum.PurchaseInvoiceItem}`,
      listener
    );

    this.fyo.doc.observer.on(`delete:${ModelNameEnum.SalesInvoice}`, listener);

    this.fyo.doc.observer.on(
      `delete:${ModelNameEnum.PurchaseInvoice}`,
      listener
    );
  }

  setDefaultFilters() {
    if (!this.toDate) {
      this.toDate = DateTime.now().plus({ days: 1 }).toISODate();
      this.fromDate = DateTime.now().minus({ years: 1 }).toISODate();
    }
  }

  async setReportData(filter?: string, force?: boolean) {
    this.loading = true;

    if (this.shouldRefresh || force || !this.reportData.length) {
      this.reportData = await this._generateRealReportData();
    }

    this.loading = false;
    this.shouldRefresh = false;
  }

  async _generateRealReportData(): Promise<ReportData> {
    // Fetch data from... the database obvi!!
    const salesData = await this._fetchSalesInvoiceItems();
    const purchaseData = await this._fetchPurchaseInvoiceItems();
    const itemCosts = await this._calculateItemCosts(purchaseData);
    const processedData = await this._processProfitLossData(
      salesData,
      itemCosts
    );

    const reportData: ReportData = [];

    for (const entry of processedData) {
      const row: ReportRow = {
        cells: [
          // Item
          {
            value: entry.item,
            rawValue: entry.item,
            align: 'left',
            width: 2,
          },
          // Quantity
          {
            value: this.fyo.format(entry.quantity, FieldTypeEnum.Float),
            rawValue: entry.quantity,
            align: 'right',
            width: 1,
          },
          // Revenue
          {
            value: this.fyo.format(entry.revenue, FieldTypeEnum.Currency),
            rawValue: entry.revenue,
            align: 'right',
            width: 1.25,
          },
          // COGS
          {
            value: this.fyo.format(entry.cogs, FieldTypeEnum.Currency),
            rawValue: entry.cogs,
            align: 'right',
            width: 1.25,
          },
          // Gross Profit
          {
            value: this.fyo.format(entry.grossProfit, FieldTypeEnum.Currency),
            rawValue: entry.grossProfit,
            align: 'right',
            width: 1.25,
            color: entry.grossProfit >= 0 ? 'green' : 'red',
          },
          // Margin %
          {
            value: this.fyo.format(entry.marginPercent, FieldTypeEnum.Percent),
            rawValue: entry.marginPercent,
            align: 'right',
            width: 1,
          },
          // Contribution %
          {
            value: this.fyo.format(
              entry.contributionPercent,
              FieldTypeEnum.Percent
            ),
            rawValue: entry.contributionPercent,
            align: 'right',
            width: 1,
          },
        ],
      };

      reportData.push(row);
    }

    return reportData;
  }

  async _fetchSalesInvoiceItems(): Promise<SalesInvoiceItem[]> {
    const filters: QueryFilter = {};

    if (this.toDate) {
      filters.date ??= [];
      (filters.date as string[]).push('<', this.toDate as string);
    }

    if (this.fromDate) {
      filters.date ??= [];
      (filters.date as string[]).push('>=', this.fromDate as string);
    }

    // Get sales invoices within date range
    const salesInvoices = await this.fyo.db.getAllRaw('SalesInvoice', {
      fields: ['name', 'date', 'party'],
      filters,
    });

    const salesInvoiceNames = salesInvoices.map((inv) => inv.name as string);

    if (salesInvoiceNames.length === 0) {
      return [];
    }

    // Get sales invoice items
    const salesItems = await this.fyo.db.getAllRaw('SalesInvoiceItem', {
      fields: ['item', 'quantity', 'amount', 'parent', 'rate'],
      filters: { parent: ['in', salesInvoiceNames] },
    });

    return salesItems.map((item) => ({
      item: item.item as string,
      quantity: safeParseFloat(item.quantity),
      amount: safeParseFloat(item.amount),
      parent: item.parent as string,
      rate: safeParseFloat(item.rate),
    }));
  }

  async _fetchPurchaseInvoiceItems(): Promise<PurchaseInvoiceItem[]> {
    const filters: QueryFilter = {};

    if (this.toDate) {
      filters.date ??= [];
      (filters.date as string[]).push('<', this.toDate as string);
    }

    if (this.fromDate) {
      filters.date ??= [];
      (filters.date as string[]).push('>=', this.fromDate as string);
    }

    // Get purchase invoices within date range
    const purchaseInvoices = await this.fyo.db.getAllRaw('PurchaseInvoice', {
      fields: ['name', 'date', 'party'],
      filters,
    });

    const purchaseInvoiceNames = purchaseInvoices.map(
      (inv) => inv.name as string
    );

    if (purchaseInvoiceNames.length === 0) {
      return [];
    }

    // Get purchase invoice items
    const purchaseItems = await this.fyo.db.getAllRaw('PurchaseInvoiceItem', {
      fields: ['item', 'quantity', 'amount', 'parent', 'rate'],
      filters: { parent: ['in', purchaseInvoiceNames] },
    });

    return purchaseItems.map((item) => ({
      item: item.item as string,
      quantity: safeParseFloat(item.quantity),
      amount: safeParseFloat(item.amount),
      parent: item.parent as string,
      rate: safeParseFloat(item.rate),
    }));
  }

  async _calculateItemCosts(
    purchaseData: PurchaseInvoiceItem[]
  ): Promise<Record<string, number>> {
    const itemCosts: Record<string, number> = {};

    // Group purchases by item and calculate average cost
    const itemPurchases: Record<
      string,
      { totalAmount: number; totalQuantity: number }
    > = {};

    for (const purchase of purchaseData) {
      if (!itemPurchases[purchase.item]) {
        itemPurchases[purchase.item] = { totalAmount: 0, totalQuantity: 0 };
      }

      itemPurchases[purchase.item].totalAmount += purchase.amount;
      itemPurchases[purchase.item].totalQuantity += purchase.quantity;
    }

    // Calculate average cost per item
    for (const item in itemPurchases) {
      const { totalAmount, totalQuantity } = itemPurchases[item];
      if (totalQuantity > 0) {
        itemCosts[item] = totalAmount / totalQuantity;
      }
    }

    return itemCosts;
  }

  async _processProfitLossData(
    salesData: SalesInvoiceItem[],
    itemCosts: Record<string, number>
  ): Promise<AtomicProfitLossEntry[]> {
    // Group sales by item
    const itemSales: Record<
      string,
      {
        totalQuantity: number;
        totalRevenue: number;
        totalCOGS: number;
        parties: Set<string>;
      }
    > = {};

    let totalProfit = 0;

    for (const sale of salesData) {
      if (!itemSales[sale.item]) {
        itemSales[sale.item] = {
          totalQuantity: 0,
          totalRevenue: 0,
          totalCOGS: 0,
          parties: new Set<string>(),
        };
      }

      const costPerUnit = itemCosts[sale.item] || 0;
      const cogs = sale.quantity * costPerUnit;
      const revenue = sale.amount;
      const profit = revenue - cogs;

      itemSales[sale.item].totalQuantity += sale.quantity;
      itemSales[sale.item].totalRevenue += revenue;
      itemSales[sale.item].totalCOGS += cogs;

      totalProfit += profit;
    }

    // Convert to report entries
    const reportEntries: AtomicProfitLossEntry[] = [];

    for (const item in itemSales) {
      const sales = itemSales[item];
      const grossProfit = sales.totalRevenue - sales.totalCOGS;
      const marginPercent =
        sales.totalRevenue !== 0
          ? parseFloat(((grossProfit / sales.totalRevenue) * 100).toFixed(1))
          : 0;
      const contributionPercent =
        totalProfit !== 0
          ? parseFloat(((grossProfit / totalProfit) * 100).toFixed(1))
          : 0;

      reportEntries.push({
        item,
        quantity: sales.totalQuantity,
        revenue: sales.totalRevenue,
        cogs: sales.totalCOGS,
        grossProfit,
        marginPercent,
        contributionPercent,
        // Track parties from invoices
        party: Array.from(sales.parties).join(', ') || 'Various',
        account: 'Sales',
      });
    }

    // Sort by gross profit (descending)
    reportEntries.sort((a, b) => b.grossProfit - a.grossProfit);

    return reportEntries;
  }

  getFilters(): Field[] {
    return [
      {
        fieldtype: 'Date',
        placeholder: t`From Date`,
        label: t`From Date`,
        fieldname: 'fromDate',
      },
      {
        fieldtype: 'Date',
        placeholder: t`To Date`,
        label: t`To Date`,
        fieldname: 'toDate',
      },
      {
        fieldtype: 'Select',
        label: t`Item Type`,
        fieldname: 'itemType',
        options: [
          { label: t`Sales`, value: 'Sales' },
          { label: t`Purchase`, value: 'Purchase' },
          { label: t`Both`, value: 'Both' },
        ],
      },
      {
        fieldtype: 'Select',
        label: t`Group By`,
        fieldname: 'groupBy',
        options: [
          { label: t`Item`, value: 'Item' },
          { label: t`Party`, value: 'Party' },
          { label: t`Account`, value: 'Account' },
        ],
      },
    ] as Field[];
  }

  getColumns(): ColumnField[] {
    return [
      {
        label: t`Item`,
        fieldtype: 'Link',
        fieldname: 'item',
        align: 'left',
        width: 2,
      },
      {
        label: t`Quantity`,
        fieldtype: 'Float',
        fieldname: 'quantity',
        align: 'right',
        width: 1,
      },
      {
        label: t`Revenue`,
        fieldtype: 'Currency',
        fieldname: 'revenue',
        align: 'right',
        width: 1.25,
      },
      {
        label: t`COGS`,
        fieldtype: 'Currency',
        fieldname: 'cogs',
        align: 'right',
        width: 1.25,
      },
      {
        label: t`Gross Profit`,
        fieldtype: 'Currency',
        fieldname: 'grossProfit',
        align: 'right',
        width: 1.25,
      },
      {
        label: t`Margin %`,
        fieldtype: 'Percent',
        fieldname: 'marginPercent',
        align: 'right',
        width: 1,
      },
      {
        label: t`Contribution %`,
        fieldtype: 'Percent',
        fieldname: 'contributionPercent',
        align: 'right',
        width: 1,
      },
    ] as ColumnField[];
  }

  getActions() {
    // Import and use common export actions like other reports
    return getCommonExportActions(this);
  }

  async _getQueryFilters(): Promise<QueryFilter> {
    const filters: QueryFilter = {};

    if (this.toDate) {
      filters.date ??= [];
      (filters.date as string[]).push('<', this.toDate as string);
    }

    if (this.fromDate) {
      filters.date ??= [];
      (filters.date as string[]).push('>=', this.fromDate as string);
    }

    return filters;
  }
}
