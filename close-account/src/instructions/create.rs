use crate::state::user::User;
use borsh::{BorshDeserialize, BorshSerialize};
use pinocchio::{
    pubkey::{self, Pubkey},
    account_info::AccountInfo,
    ProgramResult,
    program_error::ProgramError,
    sysvars::{Sysvar, rent::Rent},
    instruction::{Seed, Signer},
};
use pinocchio_system::instructions::{CreateAccount, Transfer};
use solana_program_log::log;
use five8;

fn validate_data(data: &[u8]) -> Result<Vec<u8>, ProgramError> {
    let mut buffer = data;
    let mut user = match User::deserialize(&mut buffer) {
        Ok(user) => user,
        Err(_) => return Err(ProgramError::InvalidArgument),
    };

    if user.name.len() > 16 {
        user.name.truncate(16);
    }
    log!("input data: {} {}", user.name.as_str(), user.age);

    let mut buffer: Vec<u8> = Vec::new();
    match user.serialize(&mut buffer) {
        Ok(_) => Ok(buffer),
        Err(_) => return Err(ProgramError::InvalidArgument),
    }
}

pub fn create_user(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    data: &[u8],
) -> ProgramResult {
    // _program_account: 合约执行 CreateAccount 需要用到该账户
    // _sysvar_rent_account: 查询 minimum_balance 需要用户该账户
    let [payer, new_account, _program_account, _sysvar_rent_account] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !payer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }
    let (new_pub, bump) = pubkey::find_program_address(
        &[User::SEED_PREFIX.as_bytes(), payer.key()],
        program_id,
    );
    assert_eq!(new_account.key(), &new_pub);

    let form_data = validate_data(data)?;

    let rent = Rent::get()?;
    let account_span = form_data.len();
    let lamports_required = rent.minimum_balance(account_span);

    let bump_bytes = bump.to_le_bytes();


    // 使用 five8::encode_32 将 32 字节地址编码为 base58 字符串
    let mut new_pub_buf = [0u8; 44];
    five8::encode_32(&new_pub, &mut new_pub_buf);
    log!("Creating user account to address: {}", std::str::from_utf8(&new_pub_buf).unwrap());

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
        log!("Create PDA");
    }
    if lamports_required > new_account.lamports() {
        // 增加存储，账户租金不足，转账补齐
        Transfer {
            from: payer,
            to: new_account,
            lamports: lamports_required - new_account.lamports(),
        }
        .invoke()?;
        log!("Increase storage rent");
    }
    if lamports_required < new_account.lamports() {
        // 减少存储，退款给用户
        let diff = new_account.lamports() - lamports_required;
        *payer.try_borrow_mut_lamports().unwrap() += diff;
        *new_account.try_borrow_mut_lamports().unwrap() = lamports_required;
        log!("Decrease storage rent");
    }

    new_account.resize(form_data.len())?;
    log!("Alloc space {}", form_data.len());

    let mut address_info_data = new_account.try_borrow_mut_data()?;
    address_info_data.copy_from_slice(&form_data);

    Ok(())
}
