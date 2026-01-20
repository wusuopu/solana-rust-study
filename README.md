# Solana Rust Study
Solana 与 Rust 的学习练习


## 开发环境安装
### rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```
我是用的 [mise](https://github.com/jdx/mise) 工具来安装的
```bash
mise install rust@1.92.0
```


### Solana CLI
用于构建、部署程序
```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
```

然后还需要配置一下环境变量
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

### surfpool
solana-test-validator 的一个替代方案，用于在本地运行开发测试链。
https://github.com/txtx/surfpool

### Anchor CLI (可选)
solana 的一个开发框架，也可以直接使用 rust 的 原生 sdk 进行开发。
```bash
cargo install anchor-cli
```


## 开发流程
### 创建项目
```bash
cargo new --lib <name>
cd <name>
cargo add pinocchio
```

修改 `Cargo.toml`，添加内容：
```toml
[package]
edition = "2021"       # <-- 这个要改为 2021

[lib]
crate-type = ["cdylib", "lib"]
```

然后修改 `src/lib.rs`，编写程序逻辑。

### 编译
```bash
cargo build-bpf
```

编译成功会生成 target/deploy/xxx.so、 target/deploy/xxx.json 私钥两个文件

### 部署
```bash
solana program deploy target/deploy/<name>.so
```

执行成功会输出对应的 Program Id 和 Transaction Id

## 例子程序
* hello-solana
  * 一个简单的例子，在日志中输出当前程序的 Program ID
  * 执行 hello-solana/tests/invoke.ts 脚本调用该程序
