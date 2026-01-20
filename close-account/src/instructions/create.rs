use crate::state::user::User;
use pinocchio::{
    pubkey::{self, Pubkey},
    account_info::AccountInfo,
    ProgramResult,
    program_error::ProgramError,
    sysvars::{Sysvar, rent::Rent},
    instruction::{Seed, Signer},
};
use pinocchio_system::instructions::CreateAccount;
use solana_program_log::log;

pub fn create_user(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    let [payer, new_account, _program_account, _sysvar_rent_account] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !payer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }

    log!("Creating user account with data: {}", data);

    let (new_pub, bump) = pubkey::find_program_address(
        &[User::SEED_PREFIX.as_bytes(), payer.key()],
        program_id,
    );
    assert_eq!(new_account.key(), &new_pub);

    let rent = Rent::get()?;
    let account_span = User::LEN;
    let lamports_required = rent.minimum_balance(account_span);

    let bump_bytes = bump.to_le_bytes();

    log!("Creating user account to address: {} {}", bump_bytes.len(), &new_pub);

    let seeds = [
        Seed::from(User::SEED_PREFIX.as_bytes()),
        Seed::from(payer.key().as_ref()),
        Seed::from(&bump_bytes),
    ];
    let signers = [Signer::from(&seeds)];

    if new_account.lamports() == 0 {
        // 该 pda 账户不存在，则创建
        CreateAccount {
            from: payer,
            to: new_account,
            lamports: lamports_required,
            space: account_span as u64,
            owner: program_id,
        }
        .invoke_signed(&signers)?;
        log!("Created user account to address");
    }

    let mut address_info_data = new_account.try_borrow_mut_data()?;
    log!("will save data: {}", data.len());
    address_info_data.copy_from_slice(data);

    Ok(())
}
