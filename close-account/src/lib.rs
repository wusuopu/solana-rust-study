#![no_std]

use pinocchio::{
    pubkey::Pubkey,
    account_info::AccountInfo,
    entrypoint,
    ProgramResult,
    program_error::ProgramError,
    nostd_panic_handler
};

mod state;
mod instructions;

entrypoint!(process_instruction);
nostd_panic_handler!();

pub const CREATE_DISCRIMINATOR: &[u8] = b"01";
pub const CLOSE_DISCRIMINATOR: &[u8] = b"02";

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    match instruction_data.split_at(2) {
        (CREATE_DISCRIMINATOR, data) => {
            instructions::create::create_user(program_id, accounts, data)
        },
        (CLOSE_DISCRIMINATOR, _) => {
            instructions::close::close_user(program_id, accounts)
        },
        _ => return Err(ProgramError::InvalidInstructionData),
    }
}