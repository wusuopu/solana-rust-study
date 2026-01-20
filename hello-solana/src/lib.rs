use pinocchio::{
    AccountView,
    Address,
    entrypoint,
    ProgramResult,
};
use solana_program_log::log;
use five8;

entrypoint!(process_instruction);


fn process_instruction(
    program_id: &Address,
    _accounts: &[AccountView],
    _instruction_data: &[u8]
) -> ProgramResult {
    // 使用 five8::encode_32 将 32 字节地址编码为 base58 字符串
    let mut buf = [0u8; 44];
    five8::encode_32(program_id.as_array(), &mut buf);

    log!("Hello Solana! Program ID: {}", core::str::from_utf8(&buf).unwrap());
    Ok(())
}