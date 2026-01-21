import { Fyo } from 'fyo';
import { Action, ListViewSettings } from 'fyo/model/types';
import { LedgerPosting } from 'models/Transactional/LedgerPosting';
import { ModelNameEnum } from 'models/types';
import { getInvoiceActions, getTransactionStatusColumn } from '../../helpers';
import { Invoice } from '../Invoice/Invoice';
import { PurchaseInvoiceItem } from '../PurchaseInvoiceItem/PurchaseInvoiceItem';

export class PurchaseInvoice extends Invoice {
  items?: PurchaseInvoiceItem[];

  async getPosting() {
    const posting: LedgerPosting = new LedgerPosting(this, this.fyo);
    if (this.isReturn) {
      await posting.debit(this.account!, this.baseGrandTotal!);
    } else {
      await posting.credit(this.account!, this.baseGrandTotal!);
    }

    for (const item of this.items!) {
      if (this.isReturn) {
        await posting.credit(item.account!, item.amount!);
        continue;
      }
      await posting.debit(item.account!, item.amount!);
    }

    const discountAmount = this.getTotalDiscount();
    const discountAccount = this.fyo.singles.AccountingSettings
      ?.discountAccount as string | undefined;
    if (discountAccount && discountAmount.isPositive()) {
      if (this.isReturn) {
        await posting.debit(discountAccount, discountAmount);
      } else {
        await posting.credit(discountAccount, discountAmount);
      }
    }

    await posting.makeRoundOffEntry();
    return posting;
  }

  static getListViewSettings(): ListViewSettings {
    return {
      columns: [
        'name',
        getTransactionStatusColumn(),
        'party',
        'date',
        'baseGrandTotal',
        'outstandingAmount',
      ],
    };
  }

  static getActions(fyo: Fyo): Action[] {
    return getInvoiceActions(fyo, ModelNameEnum.PurchaseInvoice);
  }
}
