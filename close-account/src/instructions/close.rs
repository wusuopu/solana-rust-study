use pinocchio::{
    pubkey::Pubkey,
    account_info::AccountInfo,
    ProgramResult,
    program_error::ProgramError,
    sysvars::{Sysvar, rent::Rent},
};

pub fn close_user(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let [payer, target_account, _system_program, _sysvar_rent_account] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };

    // let rent = Rent::get()?;
    // let account_span = 0usize;
    // let lamports_required = rent.minimum_balance(account_span);
    // let diff = target_account.lamports() - lamports_required;
    // *target_account.try_borrow_mut_lamports()? -= diff;         // 仅回收存储空间，账户保留
    // *payer.try_borrow_mut_lamports()? += diff;

    let rent_balance = target_account.lamports();
    // 退还租金
    *target_account.try_borrow_mut_lamports()? = 0;         // 余额清空，账户自动会被回收
    *payer.try_borrow_mut_lamports()? += rent_balance;

    // 回收用户存储空间
    target_account.resize(0)?;

    Ok(())
}