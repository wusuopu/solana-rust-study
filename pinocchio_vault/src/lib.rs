use pinocchio::{
    AccountView, Address, ProgramResult, entrypoint, error::ProgramError
};
use solana_address::declare_deprecated_id;
pub mod instructions;
pub use instructions::*;

declare_deprecated_id!("5mGykjbQSo6skJKRe3qsVkPKJz26Naff5rjUmFdQWnrz");

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Address,
    accounts: &[AccountView],
    instruction_data: &[u8],
) -> ProgramResult {
    match instruction_data.split_first() {
        Some((Deposit::DISCRIMINATOR, data)) => Deposit::try_from((data, accounts))?.process(),
        Some((Withdraw::DISCRIMINATOR, _)) => Withdraw::try_from(accounts)?.process(),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}
